export interface IProduct {
    id: string;
    description: string;
    image: string;
    title: string;
    category: string;
    price: number | null;
}

export interface ICardActions {
    onClick: (event: MouseEvent) => void;
}

export interface IProductCard {
    product: IProduct; 
    buttonText?: string;
    itemCount: number;
}