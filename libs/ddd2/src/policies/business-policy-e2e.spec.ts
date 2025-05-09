import { createPolicyFactory, PolicyRegistry } from '../policies';
import { Specification, CompositeSpecification } from '../validations';

/**
 * End-to-end tests for Business Policy functionality
 * These tests verify that the entire system works together for real-world use cases
 */
describe('Business Policy E2E', () => {
  // Clear the registry before each test to avoid test interference
  beforeEach(() => {
    // Reset the private static property by using any type
    (PolicyRegistry as any).policies = new Map();
  });

  // Define domain entities for testing
  interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    age: number;
    isActive: boolean;
    roles: string[];
  }

  interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: Address;
    status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: Date;
  }

  interface OrderItem {
    productId: string;
    quantity: number;
    unitPrice: number;
  }

  interface Address {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  }

  describe('User Registration and Account Management', () => {
    it('should validate user registration requirements', () => {
      // Arrange
      const userPolicyFactory = createPolicyFactory<User>('user');

      // Define user validation policies using different specification types

      // Using PropertyBetweenSpecification for age validation
      userPolicyFactory.register(
        'adultUser',
        Specification.propertyBetween<User>('age', 18, Infinity),
        'UNDERAGE_USER',
        'User must be at least 18 years old',
        (user) => ({ providedAge: user.age, minimumAge: 18 }),
      );

      // Using PredicateSpecification with regex for email validation
      userPolicyFactory.register(
        'validEmail',
        Specification.create<User>((user) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email),
        ),
        'INVALID_EMAIL',
        'Email must be in a valid format',
      );

      // Create a custom specification for name validation
      class NameProvidedSpecification extends CompositeSpecification<User> {
        isSatisfiedBy(user: User): boolean {
          return (
            !!user.firstName &&
            user.firstName.trim().length > 0 &&
            !!user.lastName &&
            user.lastName.trim().length > 0
          );
        }
      }

      userPolicyFactory.register(
        'nameProvided',
        new NameProvidedSpecification(),
        'MISSING_NAME',
        'First and last name must be provided',
      );

      // Act
      const validUser: User = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        age: 25,
        isActive: true,
        roles: ['user'],
      };

      const invalidUser: User = {
        id: '2',
        firstName: 'Jane',
        lastName: '',
        email: 'invalid-email',
        age: 16,
        isActive: true,
        roles: ['user'],
      };

      // Assert
      const validResult = userPolicyFactory.checkAll(validUser);
      const invalidResult = userPolicyFactory.checkAll(invalidUser);

      expect(validResult.isSuccess).toBe(true);
      expect(invalidResult.isFailure).toBe(true);

      // Check specific violations
      const violations = invalidResult.error;
      expect(violations.length).toBe(3);

      const codes = violations.map((v) => v.code);
      expect(codes).toContain('UNDERAGE_USER');
      expect(codes).toContain('INVALID_EMAIL');
      expect(codes).toContain('MISSING_NAME');

      // Verify detailed information is provided
      const ageViolation = violations.find((v) => v.code === 'UNDERAGE_USER');
      expect(ageViolation?.details).toEqual({
        providedAge: 16,
        minimumAge: 18,
      });
    });

    it('should enforce admin-specific requirements', () => {
      // Arrange
      const userPolicyFactory = createPolicyFactory<User>('user');
      const adminPolicyFactory = createPolicyFactory<User>('admin');

      // Regular user policies with real specification implementation
      userPolicyFactory.register(
        'adultUser',
        Specification.propertyBetween<User>('age', 18, Infinity),
        'UNDERAGE_USER',
        'User must be at least 18 years old',
      );

      // Admin-specific policies
      // Using PropertyInSpecification to check if 'admin' is in the roles array
      adminPolicyFactory.register(
        'isAdmin',
        Specification.create<User>((user) => user.roles.includes('admin')),
        'NOT_ADMIN',
        'User must have admin role',
      );

      // Using a combined specification for admin age requirements
      const ageAtLeast21 = Specification.propertyBetween<User>(
        'age',
        21,
        Infinity,
      );
      const hasAdminRole = Specification.create<User>((user) =>
        user.roles.includes('admin'),
      );

      // Only apply the age restriction to users with admin role
      adminPolicyFactory.register(
        'minimumAge',
        ageAtLeast21,
        'ADMIN_TOO_YOUNG',
        'Admin must be at least 21 years old',
      );

      // Act
      const regularUser: User = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        age: 19,
        isActive: true,
        roles: ['user'],
      };

      const youngAdmin: User = {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        age: 20,
        isActive: true,
        roles: ['user', 'admin'],
      };

      const validAdmin: User = {
        id: '3',
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert@example.com',
        age: 25,
        isActive: true,
        roles: ['user', 'admin'],
      };

      // Assert
      // Regular user validation
      expect(userPolicyFactory.checkAll(regularUser).isSuccess).toBe(true);
      expect(userPolicyFactory.checkAll(youngAdmin).isSuccess).toBe(true);
      expect(userPolicyFactory.checkAll(validAdmin).isSuccess).toBe(true);

      // Admin validation
      expect(adminPolicyFactory.checkAll(regularUser).isFailure).toBe(true);
      expect(adminPolicyFactory.checkAll(youngAdmin).isFailure).toBe(true);
      expect(adminPolicyFactory.checkAll(validAdmin).isSuccess).toBe(true);

      // Check specific violations for young admin
      const youngAdminResult = adminPolicyFactory.checkAll(youngAdmin);
      expect(youngAdminResult.isFailure).toBe(true);
      expect(youngAdminResult.error.length).toBe(1);
      expect(youngAdminResult.error[0].code).toBe('ADMIN_TOO_YOUNG');
    });
  });

  describe('Order Processing System', () => {
    it('should validate order creation requirements', () => {
      // Arrange
      const orderPolicyFactory = createPolicyFactory<Order>('order');

      // Order validation policies using real specifications

      // Using PredicateSpecification to check if order has items
      orderPolicyFactory.register(
        'hasItems',
        Specification.create<Order>((order) => order.items.length > 0),
        'EMPTY_ORDER',
        'Order must contain at least one item',
      );

      // Using PropertyBetweenSpecification for amount validation
      orderPolicyFactory.register(
        'positiveAmount',
        Specification.propertyBetween<Order>('totalAmount', 0.01, Infinity),
        'INVALID_AMOUNT',
        'Order total amount must be positive',
      );

      // Creating a custom specification for validating order items
      class ValidItemsSpecification extends CompositeSpecification<Order> {
        isSatisfiedBy(order: Order): boolean {
          return order.items.every(
            (item) => item.quantity > 0 && item.unitPrice > 0,
          );
        }
      }

      orderPolicyFactory.register(
        'validItems',
        new ValidItemsSpecification(),
        'INVALID_ITEMS',
        'All order items must have positive quantity and price',
        (order) => ({
          invalidItems: order.items
            .filter((item) => item.quantity <= 0 || item.unitPrice <= 0)
            .map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
        }),
      );

      // Creating a specification for address validation
      class CompleteAddressSpecification extends CompositeSpecification<Order> {
        isSatisfiedBy(order: Order): boolean {
          const address = order.shippingAddress;
          return (
            !!address.street &&
            !!address.city &&
            !!address.zipCode &&
            !!address.country
          );
        }

        // Optional implementation of explainFailure method (defined in ISpecification)
        explainFailure(order: Order): string | null {
          const address = order.shippingAddress;
          const missingFields = [];

          if (!address.street) missingFields.push('street');
          if (!address.city) missingFields.push('city');
          if (!address.zipCode) missingFields.push('zipCode');
          if (!address.country) missingFields.push('country');

          if (missingFields.length === 0) return null;

          return `Missing required address fields: ${missingFields.join(', ')}`;
        }
      }

      orderPolicyFactory.register(
        'completeAddress',
        new CompleteAddressSpecification(),
        'INCOMPLETE_ADDRESS',
        'Shipping address must be complete',
        (order) => ({
          address: order.shippingAddress,
          missingFields: [
            !order.shippingAddress.street ? 'street' : null,
            !order.shippingAddress.city ? 'city' : null,
            !order.shippingAddress.zipCode ? 'zipCode' : null,
            !order.shippingAddress.country ? 'country' : null,
          ].filter(Boolean),
        }),
      );

      // Act
      const validOrder: Order = {
        id: 'order1',
        userId: 'user1',
        items: [
          { productId: 'prod1', quantity: 2, unitPrice: 10.99 },
          { productId: 'prod2', quantity: 1, unitPrice: 24.99 },
        ],
        totalAmount: 46.97,
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          zipCode: '12345',
          country: 'USA',
        },
        status: 'pending',
        createdAt: new Date(),
      };

      const invalidOrder: Order = {
        id: 'order2',
        userId: 'user2',
        items: [
          { productId: 'prod1', quantity: 0, unitPrice: 10.99 },
          { productId: 'prod2', quantity: 1, unitPrice: -5 },
        ],
        totalAmount: 0,
        shippingAddress: {
          street: '456 Oak St',
          city: '',
          zipCode: '54321',
          country: 'USA',
        },
        status: 'pending',
        createdAt: new Date(),
      };

      // Assert
      const validResult = orderPolicyFactory.checkAll(validOrder);
      const invalidResult = orderPolicyFactory.checkAll(invalidOrder);

      expect(validResult.isSuccess).toBe(true);
      expect(invalidResult.isFailure).toBe(true);

      // Check specific violations
      const violations = invalidResult.error;
      expect(violations.length).toBe(3);

      const codes = violations.map((v) => v.code);
      expect(codes).toContain('INVALID_AMOUNT');
      expect(codes).toContain('INVALID_ITEMS');
      expect(codes).toContain('INCOMPLETE_ADDRESS');

      // Verify detailed information
      const itemsViolation = violations.find((v) => v.code === 'INVALID_ITEMS');
      expect(itemsViolation?.details?.invalidItems.length).toBe(2);

      const addressViolation = violations.find(
        (v) => v.code === 'INCOMPLETE_ADDRESS',
      );
      expect(addressViolation?.details?.missingFields).toContain('city');
    });

    it('should enforce order transition policies', () => {
      // Arrange
      const orderTransitionFactory = createPolicyFactory<{
        order: Order;
        newStatus: string;
      }>('orderTransition');
      class ValidTransitionSpecification extends CompositeSpecification<{
        order: Order;
        newStatus: string;
      }> {
        private readonly validTransitions: Record<string, string[]> = {
          pending: ['paid', 'cancelled'],
          paid: ['shipped', 'cancelled'],
          shipped: ['delivered'],
          delivered: [],
          cancelled: [],
        };

        isSatisfiedBy(data: { order: Order; newStatus: string }): boolean {
          return (
            this.validTransitions[data.order.status]?.includes(
              data.newStatus,
            ) || false
          );
        }
      }

      orderTransitionFactory.register(
        'validTransition',
        new ValidTransitionSpecification(),
        'INVALID_TRANSITION',
        'Invalid order status transition',
        ({ order, newStatus }) => ({
          currentStatus: order.status,
          targetStatus: newStatus,
          allowedTransitions: {
            pending: ['paid', 'cancelled'],
            paid: ['shipped', 'cancelled'],
            shipped: ['delivered'],
            delivered: [],
            cancelled: [],
          }[order.status],
        }),
      );

      class PaidOrderDelaySpecification extends CompositeSpecification<{
        order: Order;
        newStatus: string;
      }> {
        isSatisfiedBy(data: { order: Order; newStatus: string }): boolean {
          if (!(data.order.status === 'paid' && data.newStatus === 'shipped')) {
            return true;
          }

          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return data.order.createdAt < oneDayAgo;
        }
      }

      orderTransitionFactory.register(
        'paidOrderDelay',
        new PaidOrderDelaySpecification(),
        'PAID_ORDER_TOO_RECENT',
        'Paid orders must be at least one day old before shipping',
        ({ order }) => ({
          orderAge: Math.round(
            (new Date().getTime() - order.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          requiredAge: 1,
        }),
      );

      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 2);

      const pendingOrder: Order = {
        id: 'order1',
        userId: 'user1',
        items: [{ productId: 'prod1', quantity: 1, unitPrice: 10 }],
        totalAmount: 10,
        shippingAddress: {
          street: 'st',
          city: 'city',
          zipCode: '123',
          country: 'USA',
        },
        status: 'pending',
        createdAt: new Date(),
      };

      const recentPaidOrder: Order = {
        ...pendingOrder,
        id: 'order2',
        status: 'paid',
        createdAt: new Date(),
      };

      const olderPaidOrder: Order = {
        ...pendingOrder,
        id: 'order3',
        status: 'paid',
        createdAt: yesterdayDate,
      };

      // Assert
      expect(
        orderTransitionFactory.checkAll({
          order: pendingOrder,
          newStatus: 'paid',
        }).isSuccess,
      ).toBe(true);

      expect(
        orderTransitionFactory.checkAll({
          order: olderPaidOrder,
          newStatus: 'shipped',
        }).isSuccess,
      ).toBe(true);

      expect(
        orderTransitionFactory.checkAll({
          order: pendingOrder,
          newStatus: 'shipped',
        }).isFailure,
      ).toBe(true);

      const recentPaidResult = orderTransitionFactory.checkAll({
        order: recentPaidOrder,
        newStatus: 'shipped',
      });

      expect(recentPaidResult.isFailure).toBe(true);

      const ageViolation = recentPaidResult.error.find(
        (v) => v.code === 'PAID_ORDER_TOO_RECENT',
      );
      expect(ageViolation).toBeDefined();
      expect(ageViolation?.details?.orderAge).toBe(0);
      expect(ageViolation?.details?.requiredAge).toBe(1);
    });
  });
});
