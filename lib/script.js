/**
* Create Event Logic
* @param {org.ticketBooking.network.CreateEvent} CreateEvent - the create event is to be processed
* @transaction
*/
async function createEvent(CreateEvent) {
    console.log('Start of CreateEvent Function');
    var factory = getFactory();
    var NS = 'org.ticketBooking.network';

    var me = getCurrentParticipant();
    var event = factory.newResource(NS, 'EventH', CreateEvent.eId);
    const ticketRegistry = await getAssetRegistry(NS + '.Ticket');
    for (var i = 0; i < CreateEvent.numberOfTickets; i++) {
        newKey = 'xxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 4 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);  // this code is non-deterministic
            return v.toString(4);
        });
        var ticket = factory.newResource(NS, 'Ticket', newKey);
        ticket.seatId = (i + 1).toString();
        ticket.ticketState = 'UNSOLD';
        ticket.facevalue = CreateEvent.facevalue;
        ticket.salePrice = 100.00;
        ticket.eventH = event;
        ticket.owner = CreateEvent.host;
        ticket.lastOwner = CreateEvent.host;
        await ticketRegistry.add(ticket);
    }
    event.date = CreateEvent.date;
    event.venue = CreateEvent.venue;
    event.eventType = CreateEvent.eventType;
    if (CreateEvent.numberOfTickets) {
        event.numberOfTickets = CreateEvent.numberOfTickets;
    }

    event.marketPrice = 100.00;
    event.host = CreateEvent.host;

    return getAssetRegistry(event.getFullyQualifiedType()).then(function (assetRegistry) {
        return assetRegistry.add(event);
    });
}

/**
* Create Sell ticket Logic
* @param {org.ticketBooking.network.SellTicket} SellTicket - the sell ticket is to be processed
* @transaction
*/

async function sellTicket(SellTicket) {
    if (SellTicket.ticket.ticketState == "UNSOLD") {
        var factory = getFactory();
        var NS = 'org.ticketBooking.network';
        const me = getCurrentParticipant();
        const ticketRegistry = await getAssetRegistry(NS + '.Ticket');

        var ticket = await ticketRegistry.get(SellTicket.ticket.tId);
        ticket.ticketState = "SALE";
        ticket.owner = SellTicket.Buyer;
        await ticketRegistry.update(ticket);
        const ticketListingRegistry = await getAssetRegistry(NS + '.TicketList');
        var ticketList = factory.newResource(NS, 'TicketList', ticket.tId);
        ticketList.state = "SALE";
        ticketList.listingPrice = ticket.salePrice;
        ticketList.ticket = ticket;
        return await ticketListingRegistry.add(ticketList);
    } else {
        throw new Error('Ticket is SOLD');
    }
}

/**
* Create Resell ticket Logic
* @param {org.ticketBooking.network.ResellTicket} ResellTicket - the Resell ticket is to be processed
* @transaction
*/

async function reSellTicket(ResellTicket) {
    var NS = 'org.ticketBooking.network';
    const me = getCurrentParticipant();
    const ticketListRegistry = await getAssetRegistry(NS + '.TicketList');
    var ticketList = await ticketListRegistry.get(ResellTicket.ticketList.tId);
    const ticketRegistry = await getAssetRegistry(NS + '.Ticket');
    var ticket = await ticketRegistry.get(ticketList.tId);

    if (ticket.ticketState == "UNSOLD" || ticket.ticketState == "RESALE" || ticket.ticketState == "USED") {
        throw new Error("ticket is not sold or it can't be resold or used again");
    } else {
        ticket.ticketState = "RESALE";
        ticket.salePrice = parseFloat(ResellTicket.salePrice);
        ticket.lastOwner = ticket.owner;
        ticket.owner = ResellTicket.Buyer;
        ticketList.state = "RESALE";
        await ticketListRegistry.update(ticketList);
        return await ticketRegistry.update(ticket);
    }
}

/**
* Create Use ticket Logic
* @param {org.ticketBooking.network.UseTicket} UseTicket - the use ticket is to be processed
* @transaction
*/

async function useTicket(UseTicket) {
    var NS = 'org.ticketBooking.network';
    const me = getCurrentParticipant();
    const ticketRegistry = await getAssetRegistry(NS + '.Ticket');
    var ticket = await ticketRegistry.get(UseTicket.ticket.tId);

    if (ticket.ticketState == "UNSOLD") {
        throw new Error("ticket is not sold");
    } else {
        const ticketListRegistry = await getAssetRegistry(NS + '.TicketList');
        var ticketList = await ticketListRegistry.get(ticket.tId);
        ticket.ticketState="USED";
        ticketList.state = "USED";
        await ticketListRegistry.update(ticketList);
        return await ticketRegistry.update(ticket);
    }
}