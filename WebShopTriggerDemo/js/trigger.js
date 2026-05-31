/**
 * trigger.js
 * Stub for the Customer Insights – Journeys real-time trigger.
 *
 * Replace the body of this function with the actual API call to your
 * CI environment when you are ready to connect the real journey.
 *
 * Expected payload shape:
 *   customer   : { id, name, email }
 *   cartItems  : [{ id, name, price, qty }, …]
 */
function triggerAbandonedCart(customer, cartItems) {
    const payload = {
        contactId: customer.id,
        contactName: customer.name,
        contactEmail: customer.email,
        cartItems: cartItems.map(i => ({
            productId: i.id,
            productName: i.name,
            unitPrice: i.price,
            quantity: i.qty,
            lineTotal: (i.price * i.qty).toFixed(2)
        })),
        cartTotal: cartItems.reduce((sum, i) => sum + i.price * i.qty, 0).toFixed(2),
        triggeredAt: new Date().toISOString()
    };

    console.log('[CI Journeys] Abandoned cart trigger fired', payload);
    console.log(payload.contactEmail);

    window["msdynmkt"].setUser({ authId: payload.contactEmail });   // ID, e-mail or phone number - see instructions
    window["msdynmkt"].trackEvent({
        name: "msdynmkt_voltexabandonedcart_095348733", //Trigger title: Voltex Abandoned Cart
        ingestionKey : "REDACTED-INGESTION-KEY",
        version: "1.0.0",
	    // To learn more about the event properties below, please see the documentation on   for custom triggers.
	    properties: {
		 "linetotal" : "123",
		 "bindingid" : "ABC123",
		 "carttotal" : payload.cartTotal

	    }
	});
    }