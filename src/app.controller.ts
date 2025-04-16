import { Controller, Get } from '@nestjs/common';
import { AggregateRoot, BusinessPolicy, BusinessRuleValidator, createPolicyFactory, DomainEvent, EventHandler, IDomainEvent, EntityId, IEventDispatcher, Specification } from '@app/libs';
import { TestRepo } from './repo';
interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  premium?: boolean;
  address?: any;
  musics?: number[];
}
class TestEvent extends DomainEvent {}

interface UserState {
  userId: string;
  isAdult: boolean;
}

class UserRoot extends AggregateRoot<string, UserState> {
  private age: number;
  
  constructor(params: { id: EntityId<string>, age: number; }) {
    super(params);
    // Enable required capabilities
    // this.enableSnapshots();
    this.enableVersioning();
    
    // Register event upcasters
    // this.registerUpcaster('OrderItemAdded', 1, {
    //   upcast: (payload, metadata) => ({
    //     ...payload,
    //     addedAt: metadata.timestamp || new Date() // Add timestamp in v2
    //   })
    // });
  }

  public static create(user: User) {
      const usr = new UserRoot({
        id: EntityId.fromText(user.id),
        age: user.age
      });
      console.log('User created:', usr);
      usr.apply(new TestEvent({
      source: UserRoot.name,
      // source: this.constructor.name,
      payload: user,
    }, {
      eventVersion: 2
    }));

    return usr;
  }
  
  // serializeState(): UserState {
  //   return {
  //     userId: this.getId().value,
  //     isAdult: Number(this.age) >= 18
  //   };
  // }
  
  // deserializeState(state: UserState): void {
    
  // }
  
  // Version-specific handlers
  // onOrderItemAdded_v1(event: TestEvent) {
  //   // Handle v1 event format
  //   // this._items.push(payload);
  //   console.log('EVENT VERSION 1')
  // }
  
  // onOrderItemAdded_v2(payload) {
  //   // Handle v2 event format with timestamp
  //   console.log('EVENT VERSION 2')
  // }
}

@Controller()
export class AppController {
  constructor(private readonly dispatcher: IEventDispatcher, private readonly repo: TestRepo) {}
  
  @Get()
  getHello() {
    const ev = new TestEvent({
      source: this.constructor.name,
    });
    

    const val1 = BusinessRuleValidator.create<{ address?: number }>()
    .addRule('address', user => user.address !== undefined, 'Name must')

    const basicUserValidator = BusinessRuleValidator.create<User>()
      .addRule('name', user => user.name.length >= 2, 'Name must have at least 2 characters')
      .addRule('email', user => /^\S+@\S+\.\S+$/.test(user.email), 'Invalid email format')
      .addRule('age', user => user.age >= 111, 'User must be 18 or older')
      .when(
        user => user.premium === true,
        validator => validator.addRule('name', user => user.name.length >= 3, 'Premium users must have longer names')
      )
      .mustSatisfy(Specification.create<User>(item => item.address !== undefined), 'Address is required')
      const user = {
        id: '1',
        email: 'test@test.com',
        name: 'Baa',
        age: 19,
        premium: true,
        musics: [1,2,3],
        address: 123
      }


      const policyFactory = createPolicyFactory<User>('user');
      policyFactory.register('MY POLICY', basicUserValidator.toSpecification(), 'POLICY_CODE', 'POLICY_MESSAGE', user => user);


      // const ag = new UserRoot({id: EntityId.fromText('asdfasfd'), age: 19});
      const ag = UserRoot.create({id: 'asdfasfd', age: 19, email: 'test', name: 'test', address: 123});

      this.repo.save(ag)

    // this.dispatcher.dispatchEvents(ev);
    return ag
    // return ag.createSnapshot()
    // return 'this.appService.getHello();'
  }
  
  @EventHandler(TestEvent)
  async handle(event: IDomainEvent) {
    // console.log('Event handled:', event);
  }
}
