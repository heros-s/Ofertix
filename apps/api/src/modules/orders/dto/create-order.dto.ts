export class OrderItemDto {
  productId: string;
  quantity: number;
}

export class ShippingAddressDto {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export class CreateOrderDto {
  items: OrderItemDto[];
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  shippingAddress: ShippingAddressDto;
  shippingValue: number;
}
