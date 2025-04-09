import './scss/styles.scss';

import { IProduct, IProductCard } from "./types/IProduct";
import { IOrderDetails, IContactInfo } from "./types/IForm";

const modalElement = document.querySelector('#modal-container') as HTMLElement;
const galleryElement = document.querySelector('.gallery') as HTMLElement;
const basketButton = document.querySelector('.header__basket') as HTMLButtonElement


type AppEventMap = {
    'product:add': IProduct;
    'product:remove': IProduct;
    'product:view': IProduct;
    'basket:update': IProductCard[];
    'order:init': IOrderDetails;
    'order:submit': IContactInfo;
    'modal:close': void;
};

type EventCallback<K extends keyof AppEventMap> = (data: AppEventMap[K]) => void;


class EventDispatcher {
    private eventListeners: {
        [K in keyof AppEventMap]?: EventCallback<K>[]
    } = {};

    subscribe<K extends keyof AppEventMap>(event: K, callback: EventCallback<K>): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event]!.push(callback);
    }

    dispatch<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
        this.eventListeners[event]?.forEach(callback => {
            (callback as EventCallback<K>)(payload);
        });
    }

    unsubscribe<K extends keyof AppEventMap>(event: K, callback: EventCallback<K>): void {
        const listeners = this.eventListeners[event] as EventCallback<K>[] | undefined;
        if (listeners) {
            this.eventListeners[event] = listeners.filter(cb => cb !== callback) as any;
        }
    }
}

const eventDispatcher = new EventDispatcher()

abstract class BaseView<T = any> {
    protected element: HTMLElement;
    protected state: T;

    constructor(container: string | HTMLElement, initialState?: T) {
        this.element = typeof container === "string" ? document.querySelector(container)! : container;
        this.state = initialState || {} as T;
        this.initialize();
    }

    protected initialize(): void {
        this.render();
        this.bindEvents();
    }

    abstract render(): void;
    abstract bindEvents(): void;

    updateState(newState: Partial<T>): void {
        this.state = { ...this.state, ...newState };
        this.render();
    }
}

class ProductCardView extends BaseView<IProduct> {
    private isInBasket = false;
    private modalView: ModalView;

    constructor(container: string | HTMLElement, modalView: ModalView, initialState?: IProduct) {
        super(container, initialState);
        this.modalView = modalView;
    }

    render(): void {
        this.element.innerHTML = `
        <div class="product-card">
          <h3>${this.state.title}</h3>
          <p>${this.state.description}</p>
          <p>${this.state.price} ₽</p>
          <button class="${this.isInBasket ? 'remove' : 'add'}">
            ${this.isInBasket ? 'Удалить из корзины' : 'Добавить в корзину'}
          </button>
        </div>
      `;
    }

    bindEvents(): void {
        const button = this.element.querySelector("button");
        button?.addEventListener("click", () => {
            const eventType = this.isInBasket ? "product:remove" : "product:add";
            eventDispatcher.dispatch(eventType, this.state);
        });

        this.element.addEventListener("click", (e) => {
            if (!(e.target as HTMLElement).closest("button")) {
                const modalContent = document.createElement("div");
                modalContent.innerHTML = `<h2>${this.state.title}</h2><p>${this.state.description}</p>`;
                this.modalView.openModal(modalContent);
                eventDispatcher.dispatch("product:view", this.state);
            }
        });
    }
}


class BasketView extends BaseView<IProductCard[]> {
    render(): void {
        this.element.innerHTML = `
      <div class="basket">
        <h2>Корзина</h2>
        <ul>
          ${this.state.map(
            (item) => `
              <li>
                ${item.product.title} × ${item.itemCount}
                <button data-id="${item.product.title}">×</button>
              </li>
            `
        ).join("")}
        </ul>
        <button class="checkout">Оформить заказ</button>
      </div>
    `;
    }

    bindEvents(): void {
        this.element.querySelectorAll("button[data-id]").forEach((button) => {
            button.addEventListener("click", () => {
                const productName = button.getAttribute("data-id")!;
                const product = this.state.find((item) => item.product.title === productName)?.product;
                if (product) eventDispatcher.dispatch("product:remove", product);
            });
        });

        this.element.querySelector(".checkout")?.addEventListener("click", () => {
            eventDispatcher.dispatch("order:init", {
                payment: "card",
                address: "",
            });
        });
    }
}

class OrderView extends BaseView<IContactInfo> {
    render(): void {
        this.element.innerHTML = `
      <div class="order-form">
        <h2>Оформление заказа</h2>
        <input type="text" placeholder="Адрес доставки" name="address" />
        <div class="payment">
          <label><input type="radio" name="payment" value="card" checked /> Оплата картой</label>
          <label><input type="radio" name="payment" value="cash" /> Наличными</label>
        </div>
        <input type="email" placeholder="Email" name="email" />
        <input type="tel" placeholder="Телефон" name="phone" />
        <button class="submit">Подтвердить заказ</button>
      </div>
    `;
    }

    bindEvents(): void {
        this.element.querySelector(".submit")?.addEventListener("click", () => {
            const form = this.element.querySelector(".order-form") as HTMLFormElement;
            const formData = new FormData(form);

            const orderData: IContactInfo = {
                email: formData.get("email") as string,
                phone: formData.get("phone") as string,
            };

            eventDispatcher.dispatch("order:submit", orderData);
        });
    }
}

class CatalogController {
    private products: IProduct[] = [];
    private basket: IProductCard[] = [];

    constructor() {
        this.subscribeToEvents();
    }

    private subscribeToEvents(): void {
        eventDispatcher.subscribe("product:add", (product) => this.addToBasket(product));
        eventDispatcher.subscribe("product:remove", (product) => this.removeFromBasket(product));
        eventDispatcher.subscribe("basket:update", (items) => this.updateBasket(items));
        eventDispatcher.subscribe("order:init", (order) => this.initOrder(order));
    }

    private addToBasket(product: IProduct): void {
        const existingItem = this.basket.find((item) => item.product.id === product.id);
        if (existingItem) {
            existingItem.itemCount++
        } else {
            this.basket.push({ product, itemCount: 1 });
        }
        eventDispatcher.dispatch("basket:update", this.basket);
    }

    private removeFromBasket(product: IProduct): void {
        this.basket = this.basket.filter((item) => item.product.id !== product.id);
        eventDispatcher.dispatch("basket:update", this.basket);
    }

    private updateBasket(items: IProductCard[]): void {
        this.basket = items;
    }

    private initOrder(order: IOrderDetails): void {
        console.log(order);
    }
}

class OrderController {
    private orderDetails: IOrderDetails | null = null;
    private contactInfo: IContactInfo | null = null;

    constructor() {
        this.subscribeToEvents();
    }

    private subscribeToEvents(): void {
        eventDispatcher.subscribe("order:init", (details) => this.setOrderDetails(details));
        eventDispatcher.subscribe("order:submit", (contact) => this.submitOrder(contact));
    }

    private setOrderDetails(details: IOrderDetails): void {
        this.orderDetails = details;
    }

    private submitOrder(contact: IContactInfo): void {
        this.contactInfo = contact;

        if (this.orderDetails && this.contactInfo) {
            const finalOrder = { ...this.orderDetails, ...this.contactInfo };
        }
    }
}

class ModalView extends BaseView<void> {
    private closeButtons: NodeListOf<HTMLButtonElement> = this.element.querySelectorAll(".modal__close");

    render(): void {

    }

    bindEvents(): void {
        this.closeButtons.forEach(button => {
            button.addEventListener("click", () => {
                this.closeModal();
                eventDispatcher.dispatch("modal:close", undefined);
            });
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeModal();
                eventDispatcher.dispatch("modal:close", undefined);
            }
        });
    }

    openModal(content?: HTMLElement): void {
        this.element.classList.add("modal_active");
        if (content) {
            this.element.querySelector(".modal__content")?.replaceChildren(content);
        }
    }

    closeModal(): void {
        this.element.classList.remove("modal_active");
    }
}

