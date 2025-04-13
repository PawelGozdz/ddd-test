import { Result } from '@/utils';
import { Specification, CoreRules, RulesRegistry, SpecificationValidator, BusinessRuleValidator } from '@/validations';
import { BusinessPolicy, createPolicyFactory } from '@/policies';

RulesRegistry.register(CoreRules);

// Domain models
interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'manager';
  departmentId?: string;
  permissions: string[];
  lastUpdatedAt: Date;
}

interface Department {
  id: string;
  name: string;
  managerIds: string[];
  allowedRoles: ('user' | 'admin' | 'manager')[];
}

interface Organization {
  id: string;
  name: string;
  subscriptionPlan: 'basic' | 'premium' | 'enterprise';
  maxUsers: number;
  maxAdmins: number;
  departmentIds: string[];
}

// Command for updating a user
interface UpdateUserCommand {
  userId: string;
  email?: string;
  name?: string;
  role?: 'user' | 'admin' | 'manager';
  departmentId?: string;
  permissions?: string[];
  updatedBy: string; // ID of the user performing the update
}

// Repository interfaces
interface IUserRepository {
  findById(id: string): Promise<Result<User, Error>>;
  findByOrganization(organizationId: string): Promise<Result<User[], Error>>;
  save(user: User): Promise<Result<User, Error>>;
}

interface IDepartmentRepository {
  findById(id: string): Promise<Result<Department, Error>>;
}

interface IOrganizationRepository {
  findById(id: string): Promise<Result<Organization, Error>>;
  findByDepartmentId(departmentId: string): Promise<Result<Organization, Error>>;
}

/**
 * Handler for updating user information
 * Demonstrates integration of validators, specifications, and policies
 */
class UserUpdateHandler {
  private userPolicies: ReturnType<typeof createPolicyFactory<User>>;
  
  constructor(
    private userRepository: IUserRepository,
    private departmentRepository: IDepartmentRepository,
    private organizationRepository: IOrganizationRepository
  ) {
    // Create policy factory for user domain
    this.userPolicies = createPolicyFactory<User>('user');
    
    // Register business policies
    this.registerBusinessPolicies();
  }

  /**
   * Handle the user update command
   */
  async handle(command: UpdateUserCommand): Promise<Result<User, Error>> {
    try {
      // 1. Load related entities
      const [userResult, updaterResult] = await Promise.all([
        this.userRepository.findById(command.userId),
        this.userRepository.findById(command.updatedBy)
      ]);
      
      if (userResult.isFailure) {
        return Result.fail(new Error(`User not found: ${command.userId}`));
      }

      if (updaterResult.isFailure) {
        return Result.fail(new Error(`Updater not found: ${command.updatedBy}`));
      }
      
      const user = userResult.value;
      const updater = updaterResult.value;
      
      // 2. Create updated user object
      const updatedUser: User = {
        ...user,
        ...(command.email && { email: command.email }),
        ...(command.name && { name: command.name }),
        ...(command.role && { role: command.role }),
        ...(command.departmentId && { departmentId: command.departmentId }),
        ...(command.permissions && { permissions: command.permissions }),
        lastUpdatedAt: new Date()
      };

      // 3. Basic validation of user data
      const validationResult = this.validateUser(updatedUser);
      if (validationResult.isFailure) {
        return Result.fail(new Error(`Validation failed: ${validationResult.error.message}`));
      }

      // 4. Check authorization using policy
      const authContext = { user: updatedUser, originalUser: user, updater };
      const authResult = await this.checkUpdateAuthorization(authContext);
      
      if (authResult.isFailure) {
        return Result.fail(new Error(`Authorization failed: ${authResult.error.message}`));
      }

      // 5. Load additional context if department changes
      let organization: Organization | undefined;
      let department: Department | undefined;
      
      if (command.departmentId && command.departmentId !== user.departmentId) {
        const deptResult = await this.departmentRepository.findById(command.departmentId);
        if (deptResult.isFailure) {
          return Result.fail(new Error(`Department not found: ${command.departmentId}`));
        }
        department = deptResult.value;
        
        const orgResult = await this.organizationRepository.findByDepartmentId(command.departmentId);
        if (orgResult.isFailure) {
          return Result.fail(new Error(`Organization not found for department: ${command.departmentId}`));
        }
        organization = orgResult.value;
        
        // 6. Validate cross-entity relationships
        const relationResult = await this.validateRelationships(updatedUser, department, organization);
        if (relationResult.isFailure) {
          return Result.fail(new Error(`Relationship validation failed: ${relationResult.error.message}`));
        }
      }

      // 7. Check business policies
      const policyResult = this.userPolicies.checkAll(updatedUser);
      if (policyResult.isFailure) {
        const violations = policyResult.error.map(v => v.message).join(', ');
        return Result.fail(new Error(`Policy violations: ${violations}`));
      }

      // 8. Persist changes
      const saveResult = await this.userRepository.save(updatedUser);
      if (saveResult.isFailure) {
        return Result.fail(new Error(`Failed to save user: ${saveResult.error.message}`));
      }

      return Result.ok(updatedUser);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate basic user properties
   */
  private 
  validateUser(user: User): Result<User, Error> {
    // Create validator using Rules and BusinessRuleValidator
    const validator = BusinessRuleValidator.create<User>()
      .apply(RulesRegistry.Rules.required('id', 'User ID is required'))
      .apply(RulesRegistry.Rules.email('email', 'Invalid email format'))
      .apply(RulesRegistry.Rules.minLength('name', 2, 'Name must be at least 2 characters'))
      // .apply(RulesRegistry.Rules.satisfies(
      //   Specification.create<User>(user => ['user', 'admin', 'manager'].includes(user.role)),
      //   'Invalid user role'
      // ))
      // .addRule('role', Specification.create<User>(user => ['user', 'admin', 'manager'].includes(user.role))., 'Invalid user role')
      .addSpecification('role', Specification.create<User>(user => ['user', 'admin', 'manager'].includes(user.role)), 'Invalid user role')
      .when(
        user => user.role === 'admin',
        validator => validator.addRule(
          'permissions', 
          user => user.permissions.includes('manage_users'), 
          'Admin must have manage_users permission'
        )
      );
    
    return validator.validate(user).isSuccess 
      ? Result.ok(user) 
      : Result.fail(new Error(validator.validate(user).error.message));
  }

  /**
   * Check if the updater has permission to update the user
   */
  private async checkUpdateAuthorization(context: { 
    user: User, 
    originalUser: User, 
    updater: User 
  }): Promise<Result<boolean, Error>> {
    const isSelfUpdateWithLimitedChanges = Specification.create<typeof context>(ctx => {
      // Self-update (nie można zmieniać roli ani uprawnień)
      return ctx.updater.id === ctx.originalUser.id &&
             ctx.user.role === ctx.originalUser.role && 
             JSON.stringify(ctx.user.permissions) === JSON.stringify(ctx.originalUser.permissions);
    });
    
    const isAdminWithManageUsersPermission = Specification.create<typeof context>(ctx => {
      return ctx.updater.role === 'admin' && ctx.updater.permissions.includes('manage_users');
    });
    
    const isManagerOfUsersDepartment = Specification.create<typeof context>(ctx => {
      return ctx.updater.role === 'manager' && 
             ctx.updater.departmentId === ctx.originalUser.departmentId &&
             ctx.user.role === ctx.originalUser.role;  // Nie zmienia roli
    });
    
    // Łączymy specyfikacje za pomocą operatorów OR
    const canUpdateUserSpec = Specification.or(
      isSelfUpdateWithLimitedChanges,
      isAdminWithManageUsersPermission,
      isManagerOfUsersDepartment
    ).and(isSelfUpdateWithLimitedChanges)
    
    // Tworzymy walidator oparty na specyfikacji
    // const authorizationValidator = SpecificationValidator.create<typeof context>()
    //   .addRule(
    //     canUpdateUserSpec,
    //     'User does not have permission to perform this update',
    //     'authorization'
    //   );
    
    // Użycie w metodzie:
    // const result = authorizationValidator.validate(context);
    // return result.isSuccess ? Result.ok(true) : Result.fail(new Error(result.error.message));
    
    // Alternatywnie możemy nadal używać polityki:
    const canUpdatePolicy = BusinessPolicy.fromSpecification(
      canUpdateUserSpec,
      'AUTH_UPDATE_USER',
      'User does not have permission to perform this update'
    )
    // Use specification-based policy
    // const canUpdatePolicy = BusinessPolicy.fromSpecification(
    //   Specification.create<typeof context>(ctx => {
    //     // Self-update (limited fields)
    //     if (ctx.updater.id === ctx.originalUser.id) {
    //       // Can't change own role or permissions
    //       return ctx.user.role === ctx.originalUser.role && 
    //              JSON.stringify(ctx.user.permissions) === JSON.stringify(ctx.originalUser.permissions);
    //     }
        
    //     // Admin with manage_users permission can update anything
    //     if (ctx.updater.role === 'admin' && ctx.updater.permissions.includes('manage_users')) {
    //       return true;
    //     }
        
    //     // Manager can update users in their department (except roles)
    //     if (ctx.updater.role === 'manager' && 
    //         ctx.updater.departmentId === ctx.originalUser.departmentId) {
    //       return ctx.user.role === ctx.originalUser.role;
    //     }
        
    //     return false;
    //   }),
    //   'AUTH_UPDATE_USER',
    //   'User does not have permission to perform this update'
    // );

    const result = canUpdatePolicy.check(context);
    return result.isSuccess ? Result.ok(true) : Result.fail(new Error(result.error.message));
  }

  /**
   * Validate relationships between user, department and organization
   */
  private async validateRelationships(
    user: User, 
    department: Department, 
    organization: Organization
  ): Promise<Result<boolean, Error>> {
    // Cross-entity validation using SpecificationValidator
    const relationValidator = SpecificationValidator.create<{
      user: User,
      department: Department,
      organization: Organization
    }>();
    
    // Validate department-user relationship
    relationValidator.addRule(
      Specification.create(ctx => ctx.department.allowedRoles.includes(ctx.user.role)),
      'User role is not allowed in this department'
    );

    // If user is manager, must be in department's manager list
    relationValidator.addRule(
      Specification.create(ctx => 
        ctx.user.role !== 'manager' || ctx.department.managerIds.includes(ctx.user.id)
      ),
      'User must be listed as a manager to have manager role'
    );

    // Check organization constraints
    if (user.role === 'admin') {
      // Count existing admins in organization
      const usersResult = await this.userRepository.findByOrganization(organization.id);
      if (usersResult.isSuccess) {
        const currentAdmins = usersResult.value.filter(u => 
          u.role === 'admin' && u.id !== user.id
        ).length;
        
        relationValidator.addRule(
          Specification.create(ctx => currentAdmins + 1 <= ctx.organization.maxAdmins),
          `Organization can have maximum ${organization.maxAdmins} admins`,
          'organization.maxAdmins'
        );
      }
    }

    // Check subscription plan constraints
    relationValidator.addPropertyRule(
      'organization',
      Specification.create<Organization>(org => 
        org.subscriptionPlan === 'enterprise' || user.permissions.length <= 5
      ),
      'Advanced permissions require Enterprise subscription',
      ctx => ctx.organization
    );

    const result = relationValidator.validate({user, department, organization});
    return result.isSuccess ? Result.ok(true) : Result.fail(new Error(result.error.message));
  }

  /**
   * Register domain-specific business policies
   */
  private registerBusinessPolicies(): void {
    // Valid email domain specification
    const hasValidEmailDomain = Specification.create<User>(user => 
      user.email.endsWith('.com') || user.email.endsWith('.org') || user.email.endsWith('.net')
    );
    
    // Register email domain policy
    this.userPolicies.register(
      'validEmailDomain',
      hasValidEmailDomain,
      'USER_EMAIL_DOMAIN',
      'Email domain must be .com, .org, or .net',
      user => ({ email: user.email })
    );

    // Password change frequency policy
    const passwordChangeSpec = Specification.create<User>(user => {
      // Simplified example - in real app would check password change history
      const daysSinceUpdate = (Date.now() - user.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate <= 90; // Password must be changed every 90 days
    });

    this.userPolicies.register(
      'passwordChangeFrequency',
      passwordChangeSpec,
      'USER_PASSWORD_AGE',
      'Password must be changed every 90 days',
      user => ({ 
        lastUpdatedAt: user.lastUpdatedAt,
        daysSinceUpdate: Math.floor((Date.now() - user.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24))
      })
    );
  }
}

export { UserUpdateHandler, UpdateUserCommand };