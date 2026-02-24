export type ProductType = 't-shirt' | 'hoodie' | 'cap' | 'tote-bag' | 'mug' | 'phone-case' | 'poster';

export interface MockupRequest {
  logoBase64: string;
  productType: ProductType;
  prompt?: string;
  color?: string;
}

export interface GeneratedMockup {
  id: string;
  imageUrl: string;
  productType: ProductType;
  timestamp: number;
  prompt?: string;
}
