export class CreateProductDto {
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  stock: number;
  images: string[];
  active?: boolean;
}
