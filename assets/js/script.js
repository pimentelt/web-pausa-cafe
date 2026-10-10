const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");

    if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target ||
        link.hasAttribute("download") ||
        prefersReducedMotion.matches
    ) {
        return;
    }

    const destination = new URL(link.href, window.location.href);

    if (
        destination.origin !== window.location.origin ||
        destination.pathname === window.location.pathname
    ) {
        return;
    }

    event.preventDefault();
    document.body.classList.add("is-leaving");

    window.setTimeout(() => {
        window.location.assign(destination.href);
    }, 120);
});

const orderList = document.querySelector("#order-items");

if (orderList) {
    const order = new Map();
    const emptyOrderMessage = document.querySelector("#empty-order");
    const totalElement = document.querySelector("#order-total");
    const statusElement = document.querySelector("#order-status");
    const serviceSummary = document.querySelector("#service-summary");
    const deliveryFields = document.querySelector("#delivery-fields");
    const deliveryInputs = [...document.querySelectorAll("[data-delivery-required]")];
    const deliveryFeeRow = document.querySelector("#delivery-fee-row");
    const confirmationDialog = document.querySelector("#order-confirmation");
    const deliveryFee = 5;
    const currency = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    const serviceLabels = {
        local: "Consumo no local",
        retirada: "Retirada para levar",
        entrega: "Entrega"
    };

    document.querySelectorAll("[name='service-mode']").forEach((option) => {
        option.addEventListener("change", () => {
            const isDelivery = option.value === "entrega";
            deliveryFields.hidden = !isDelivery;
            deliveryInputs.forEach((input) => {
                input.required = isDelivery;
            });

            if (!isDelivery) {
                deliveryFields.querySelectorAll("input").forEach((input) => {
                    input.value = "";
                });
            }

            serviceSummary.textContent = `Forma de atendimento: ${serviceLabels[option.value]}.`;
            statusElement.textContent = "";
            renderOrder();
        });
    });

    function renderOrder() {
        orderList.replaceChildren();
        let total = 0;
        let itemCount = 0;

        order.forEach((details, name) => {
            const subtotal = details.price * details.quantity;
            total += subtotal;
            itemCount += details.quantity;

            const item = document.createElement("li");
            item.className = "order-cart-item";

            const itemName = document.createElement("span");
            itemName.textContent = name;

            const itemSubtotal = document.createElement("strong");
            itemSubtotal.textContent = currency.format(subtotal);

            const itemUnitPrice = document.createElement("small");
            itemUnitPrice.textContent = `${details.quantity} × ${currency.format(details.price)}`;

            const controls = document.createElement("div");
            controls.className = "order-quantity-controls";

            const decreaseButton = document.createElement("button");
            decreaseButton.type = "button";
            decreaseButton.textContent = "−";
            decreaseButton.setAttribute("aria-label", `Remover uma unidade de ${name}`);
            decreaseButton.dataset.orderAction = "decrease";
            decreaseButton.dataset.item = name;

            const quantity = document.createElement("span");
            quantity.textContent = details.quantity;
            quantity.setAttribute("aria-label", "Quantidade");

            const increaseButton = document.createElement("button");
            increaseButton.type = "button";
            increaseButton.textContent = "+";
            increaseButton.setAttribute("aria-label", `Adicionar uma unidade de ${name}`);
            increaseButton.dataset.orderAction = "increase";
            increaseButton.dataset.item = name;

            controls.append(decreaseButton, quantity, increaseButton);
            item.append(itemName, itemSubtotal, itemUnitPrice, controls);
            orderList.append(item);
        });

        emptyOrderMessage.hidden = itemCount > 0;
        const selectedService = document.querySelector("[name='service-mode']:checked");
        const shouldChargeDelivery = selectedService?.value === "entrega" && itemCount > 0;
        deliveryFeeRow.hidden = !shouldChargeDelivery;

        if (shouldChargeDelivery) {
            total += deliveryFee;
        }

        totalElement.textContent = currency.format(total);
    }

    document.addEventListener("click", (event) => {
        const addButton = event.target.closest(".add-order-item");
        const quantityButton = event.target.closest("[data-order-action]");

        if (addButton) {
            const name = addButton.dataset.item;
            const price = Number(addButton.dataset.price);
            const existingItem = order.get(name);

            order.set(name, {
                price,
                quantity: (existingItem?.quantity ?? 0) + 1
            });

            statusElement.textContent = `${name} adicionado ao pedido.`;
            renderOrder();
            return;
        }

        if (quantityButton) {
            const name = quantityButton.dataset.item;
            const currentItem = order.get(name);

            if (!currentItem) return;

            if (quantityButton.dataset.orderAction === "increase") {
                currentItem.quantity += 1;
            } else if (currentItem.quantity > 1) {
                currentItem.quantity -= 1;
            } else {
                order.delete(name);
            }

            statusElement.textContent = "Pedido atualizado.";
            renderOrder();
        }
    });

    document.querySelector("#finish-order").addEventListener("click", () => {
        const selectedService = document.querySelector("[name='service-mode']:checked");

        if (!selectedService) {
            statusElement.textContent = "Escolha consumir aqui, retirar para levar ou receber por entrega.";
            return;
        }

        if (selectedService.value === "entrega") {
            const invalidAddressField = deliveryInputs.find((input) => !input.checkValidity());
            if (invalidAddressField) {
                invalidAddressField.reportValidity();
                statusElement.textContent = "Preencha o nome e os dados do endereço para a entrega.";
                return;
            }
        }

        if (order.size === 0) {
            statusElement.textContent = "Adicione algum item antes de concluir o pedido.";
            return;
        }

        statusElement.textContent = "";
        confirmationDialog.showModal();
    });

    function closeConfirmation() {
        if (!confirmationDialog.open || confirmationDialog.classList.contains("is-closing")) return;

        confirmationDialog.classList.add("is-closing");
        confirmationDialog.addEventListener("animationend", () => {
            confirmationDialog.close();
            confirmationDialog.classList.remove("is-closing");
        }, { once: true });
    }

    document.querySelector("#close-order-confirmation").addEventListener("click", closeConfirmation);

    confirmationDialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeConfirmation();
    });

    confirmationDialog.addEventListener("click", (event) => {
        if (event.target === confirmationDialog) {
            closeConfirmation();
        }
    });

    renderOrder();
}
