import { Specification, CoreRules, RulesRegistry, Validation, SpecificationValidator, BusinessRuleValidator } from '@/validations';
import { Result } from '@/utils';

RulesRegistry.register(CoreRules);

// ----- Basic domain models -----

interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  premium?: boolean;
  address?: Address;
}

interface Address {
  street: string;
  city: string;
  zip: string;
  country: string;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface LoanApplication {
  applicantId: string;
  amount: number;
  term: number; // months
  income: number;
  creditScore: number;
  hasExistingLoan: boolean;
  applicationDate: Date;
}

// ----- 1. Basic Business Rule Validator -----

const basicUserValidator = BusinessRuleValidator.create<User>()
  .addRule('name', user => user.name.length >= 2, 'Name must have at least 2 characters')
  .addRule('email', user => /^\S+@\S+\.\S+$/.test(user.email), 'Invalid email format')
  .addRule('age', user => user.age >= 18, 'User must be 18 or older')
  .when(
    user => user.premium === true,
    validator => validator.addRule('name', user => user.name.length >= 3, 'Premium users must have longer names')
  );

// ----- 2. Using enhanced methods with specifications -----

// Define specifications
const isAdult = Specification.create<User>(user => user.age >= 18);
const hasPremiumName = Specification.create<User>(user => user.name.length >= 3);
const hasValidEmail = Specification.create<User>(user => /^\S+@\S+\.\S+$/.test(user.email));

// Create validator using new methods
const specBasedUserValidator = BusinessRuleValidator.create<User>()
  .mustSatisfy(isAdult, 'User must be 18 or older')
  .mustSatisfy(hasValidEmail, 'Invalid email format')
  // .propertyMustSatisfy('email', hasValidEmail, 'Invalid email format', user => user.email)
  .whenSatisfies(
    Specification.create<User>(user => user.premium === true),
    validator => validator.mustSatisfy(hasPremiumName, 'Premium users must have longer names')
  );

// ----- 3. Using SpecificationValidator -----

const userSpecValidator = SpecificationValidator.create<User>()
  .addRule(isAdult, 'User must be 18 or older')
  .addRule(hasValidEmail, 'Invalid email format', 'email')
  .addPropertyRule(
    'name', 
    Specification.create<string>(name => name.length >= 2),
    'Name must have at least 2 characters',
    user => user.name
  );

// ----- 4. Complex validation with nested objects -----

// First define address validator
const addressValidator = BusinessRuleValidator.create<Address>()
  .addRule('street', addr => addr.street.length > 0, 'Street cannot be empty')
  .addRule('city', addr => addr.city.length > 0, 'City cannot be empty')
  .addRule('zip', addr => /^\d{5}(-\d{4})?$/.test(addr.zip), 'Invalid ZIP code format')
  .addRule('country', addr => addr.country.length > 0, 'Country cannot be empty');

// Then create a nested user validator
const complexUserValidator = BusinessRuleValidator.create<User>()
  // Basic user validation
  .apply(RulesRegistry.Rules.required('name', 'Name is required'))
  .apply(RulesRegistry.Rules.minLength('name', 2, 'Name must have at least 2 characters'))
  .apply(RulesRegistry.Rules.email('email', 'Invalid email format'))
  .apply(RulesRegistry.Rules.satisfies(isAdult, 'User must be 18 or older'))
  
  // Conditional validation - different rules for premium users
  .whenSatisfies(
    Specification.create<User>(user => user.premium === true),
    validator => {
      validator
        .apply(RulesRegistry.Rules.minLength('name', 3, 'Premium users must have longer names'))
        .addRule('email', user => user.email.includes('premium'), 'Premium users need premium email domain');
    }
  )
  
  // Nested validation for address (when present)
  .when(
    user => user.address !== undefined && user.address !== null,
    validator => validator.addNested(
      'address',
      addressValidator,
      user => user.address
    )
  );

// ----- 5. Order validation with complex business rules -----

// Order item specifications
const hasPositiveQuantity = Specification.create<OrderItem>(item => item.quantity > 0);
const hasPriceConsistency = Specification.create<OrderItem>(
  item => Math.abs(item.totalPrice - (item.quantity * item.unitPrice)) < 0.01
);

// Order item validator
const orderItemValidator = BusinessRuleValidator.create<OrderItem>()
  .mustSatisfy(hasPositiveQuantity, 'Item quantity must be positive')
  .mustSatisfy(hasPriceConsistency, 'Item price calculation is inconsistent')
  .addRule('productId', item => item.productId.length > 0, 'Product ID cannot be empty');

// Order specifications
const hasItems = Specification.create<Order>(order => order.items.length > 0);
const hasValidTotalAmount = Specification.create<Order>(order => {
  const calculatedTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  return Math.abs(calculatedTotal - order.totalAmount) < 0.01;
});
const isPendingOrConfirmed = Specification.create<Order>(
  order => ['pending', 'confirmed'].includes(order.status)
);

// Complete order validator with nested validation of all items
const orderValidator = BusinessRuleValidator.create<Order>()
  .mustSatisfy(hasItems, 'Order must contain at least one item')
  .mustSatisfy(hasValidTotalAmount, 'Order total amount is inconsistent with item prices')
  .addRule('userId', order => order.userId.length > 0, 'User ID cannot be empty')
  .addRule('items', order => {
    // Validate each item individually
    for (let i = 0; i < order.items.length; i++) {
      const itemResult = orderItemValidator.validate(order.items[i]);
      if (itemResult.isFailure) {
        return false;
      }
    }
    return true;
  }, 'One or more order items are invalid')
  .whenSatisfies(
    isPendingOrConfirmed,
    validator => validator.addRule(
      'createdAt', 
      order => {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - order.createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      },
      'Pending or confirmed orders cannot be older than 30 days'
    )
  );

// ----- 6. Loan application with business policies -----

// Create complex specifications for loan eligibility
const hasMinimumIncome = Specification.create<LoanApplication>(app => app.income >= 30000);
const hasGoodCreditScore = Specification.create<LoanApplication>(app => app.creditScore >= 700);
const hasModerateCreditScore = Specification.create<LoanApplication>(app => app.creditScore >= 600 && app.creditScore < 700);
const hasReasonableLoanAmount = Specification.create<LoanApplication>(app => app.amount <= app.income * 0.5);
const hasNoExistingLoan = Specification.create<LoanApplication>(app => !app.hasExistingLoan);
const hasReasonableTerm = Specification.create<LoanApplication>(app => app.term >= 6 && app.term <= 60);

// Combine specifications for complex business rules
const isEligibleForPremiumLoan = Specification.and(
  hasMinimumIncome,
  hasGoodCreditScore,
  hasReasonableLoanAmount,
  hasReasonableTerm
);

const isEligibleForStandardLoan = Specification.and(
  hasMinimumIncome,
  hasModerateCreditScore,
  hasNoExistingLoan,
  hasReasonableLoanAmount,
  Specification.create<LoanApplication>(app => app.term <= 36)
);

const isEligibleForAnyLoan = isEligibleForPremiumLoan.or(isEligibleForStandardLoan);

// Create validator from specifications
const loanApplicationValidator = SpecificationValidator.create<LoanApplication>()
  .addRule(hasMinimumIncome, 'Applicant must have minimum annual income of $30,000', 'income')
  .addRule(hasReasonableLoanAmount, 'Loan amount cannot exceed 50% of annual income', 'amount')
  .addRule(hasReasonableTerm, 'Loan term must be between 6 and 60 months', 'term')
  .addRule(
    Specification.create<LoanApplication>(app => app.creditScore >= 600),
    'Minimum credit score of 600 is required',
    'creditScore'
  );

// ----- 7. Example usage with loan eligibility determination -----

const evaluateLoanApplication = (application: LoanApplication): Result<string, string> => {
  // First validate the application data
  const validationResult = loanApplicationValidator.validate(application);
  
  if (validationResult.isFailure) {
    return Result.fail(`Invalid application: ${validationResult.error.message}`);
  }
  
  // Then check eligibility using specifications
  if (isEligibleForPremiumLoan.isSatisfiedBy(application)) {
    return Result.ok('Eligible for premium loan with favorable terms');
  }
  
  if (isEligibleForStandardLoan.isSatisfiedBy(application)) {
    return Result.ok('Eligible for standard loan');
  }
  
  return Result.fail('Not eligible for loan at this time');
};

// ----- 8. Using validation helpers for deep paths -----

const validateUserWithDeepPath = (user: User): Result<User, string> => {
  // Check if address.zip is valid when country is US
  if (user.address && user.address.country === 'US') {
    const zipValidator = BusinessRuleValidator.create<string>()
      .addRule('', zip => /^\d{5}(-\d{4})?$/.test(zip), 'US ZIP codes must be in format 12345 or 12345-6789');
      
    const zipResult = Validation.validatePath(
      user,
      ['address', 'zip'],
      zipValidator
    );
    
    if (zipResult.isFailure) {
      return Result.fail(zipResult.error.message);
    }
  }
  
  return Result.ok(user);
};

// ----- Usage demo -----

const demoValidation = () => {
  const validUser: User = {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    age: 25,
    address: {
      street: '123 Main St',
      city: 'Anytown',
      zip: '12345',
      country: 'US'
    }
  };
  
  const invalidUser: User = {
    id: '456',
    name: 'J',  // Too short
    email: 'invalid-email',
    age: 16,  // Too young
    premium: true,  // Requires longer name
    address: {
      street: '',
      city: 'Anytown',
      zip: 'invalid',
      country: 'US'
    }
  };
  
  console.log('Basic validation result:', basicUserValidator.validate(validUser).isSuccess);
  console.log('Specification-based validation result:', specBasedUserValidator.validate(validUser).isSuccess);
  
  const invalidResult = complexUserValidator.validate(invalidUser);
  console.log('Complex validation failed with errors:', 
    invalidResult.isFailure ? invalidResult.error.errors.map(e => e.toString()) : 'No errors');
    
  // Loan application example
  const loanApp: LoanApplication = {
    applicantId: '789',
    amount: 20000,
    term: 24,
    income: 60000,
    creditScore: 710,
    hasExistingLoan: false,
    applicationDate: new Date()
  };
  
  const loanResult = evaluateLoanApplication(loanApp);
  console.log('Loan evaluation result:', loanResult.isSuccess ? loanResult.value : loanResult.error);
};

export { 
  basicUserValidator, 
  specBasedUserValidator, 
  userSpecValidator, 
  complexUserValidator,
  orderValidator,
  loanApplicationValidator,
  evaluateLoanApplication,
  validateUserWithDeepPath,
  demoValidation
};