import { BaseValueObject } from '@/src';

interface ProductItemProps {
  productId: string;
  quantity: number;
  price: number;
}

export class ProductItem extends BaseValueObject<ProductItemProps> {
  get productId(): string {
    return this.value.productId;
  }

  get quantity(): number {
    return this.value.quantity;
  }

  get price(): number {
    return this.value.price;
  }

  validate() {
    // Walidacja
    if (this.quantity <= 0) {
      throw new Error('Product quantity must be positive');
    }

    if (this.price < 0) {
      throw new Error('Product price cannot be negative');
    }

    return true;
  }

  constructor(productId: string, quantity: number, price: number) {
    super({ productId, quantity, price });

    this.validate();
  }
}
