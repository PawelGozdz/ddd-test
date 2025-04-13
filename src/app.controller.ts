import { Controller, Get } from '@nestjs/common';
import { AggregateRoot, BusinessPolicy, BusinessRuleValidator, createPolicyFactory, DomainEvent, EventHandler, IAggregateRoot, IDomainEvent, EntityId, IEventDispatcher, Specification } from '@app/libs';
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

class Test extends AggregateRoot<string> {
  constructor(id: string) {
    super({
      id: EntityId.createWithRandomUUID(),
    });
  }

  public static create(id: string): Test {
    const instance = new Test(id)
    instance.getId()
    instance.apply(new TestEvent({ id },{ source: instance.constructor.name }));
    return instance;
  }

  onTestEvent(event: TestEvent): void {
    console.log('Handling test event==s===>+++', event);
  }

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


      const ag = Test.create('1');

      this.repo.save(ag)

    // this.dispatcher.dispatchEvents(ev);
    return ag.createSnapshot()
    // return 'this.appService.getHello();'
  }
  
  @EventHandler(TestEvent)
  async handle(event: IDomainEvent) {
    // console.log('Event handled:', event);
  }
}
