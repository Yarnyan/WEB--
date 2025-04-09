export interface IFormState {
    isValid: boolean;
    errors: string[];
}

export interface IOrderDetails {
    payment: string;
    address: string;
}

export interface IContactInfo {
    email: string;
    phone: string;
}

export interface IOrder extends IOrderDetails, IContactInfo {
    total: number | string;
    items: string[];
}

export interface IContacts extends IContactInfo {
    items: string[];
}

export type FormErrorsOrder = Partial<Record<keyof IOrder, string>>;
export type FormErrorsContacts = Partial<Record<keyof IContacts, string>>;