/**
 * products.js
 * Product catalog data for the demo web shop.
 * Inspired by the electric supply materials range at rexel.co.uk.
 */

const PRODUCTS = [
    {
        id: 'p01',
        name: 'NYM-J 3×1.5mm² Grey Cable',
        description: 'Flexible PVC-sheathed installation cable, 3-core 1.5mm². Sold per metre.',
        category: 'Cables',
        price: 1.25,
        image: 'img/cable-3x1-5.svg'
    },
    {
        id: 'p02',
        name: 'NYM-J 5×2.5mm² Grey Cable',
        description: 'Flexible PVC-sheathed installation cable, 5-core 2.5mm². Sold per metre.',
        category: 'Cables',
        price: 2.80,
        image: 'img/cable-5x2-5.svg'
    },
    {
        id: 'p03',
        name: 'PVC Cable Trunking 40×25mm (2m)',
        description: 'White PVC cable management trunking, 2 metre length, with snap-on lid.',
        category: 'Cables',
        price: 3.40,
        image: 'img/trunking.svg'
    },
    {
        id: 'p04',
        name: 'Hager 10A MCB Type B (1P)',
        description: 'Single-pole miniature circuit breaker, 10A, Type B characteristic, 6kA.',
        category: 'Circuit Protection',
        price: 8.95,
        image: 'img/mcb.svg'
    },
    {
        id: 'p05',
        name: 'Hager 16A MCB Type C (1P)',
        description: 'Single-pole miniature circuit breaker, 16A, Type C characteristic, 6kA.',
        category: 'Circuit Protection',
        price: 9.50,
        image: 'img/mcb.svg'
    },
    {
        id: 'p06',
        name: 'Schneider 4-way RCD Protected Board',
        description: 'Compact 4-way consumer unit with 30mA RCD protection, pre-wired.',
        category: 'Circuit Protection',
        price: 54.99,
        image: 'img/consumer-unit.svg'
    },
    {
        id: 'p07',
        name: 'Eaton xEffect 32A RCBO Type B',
        description: 'Combined RCD/MCB 32A Type B, 30mA, for individual circuit protection.',
        category: 'Circuit Protection',
        price: 22.00,
        image: 'img/rcbo.svg'
    },
    {
        id: 'p08',
        name: 'Philips CorePro LED Panel 60×60 36W',
        description: 'Recessed LED panel 600×600mm, 36W, 4000K cool white, 3600lm, UGR<19.',
        category: 'Lighting',
        price: 32.50,
        image: 'img/led-panel.svg'
    },
    {
        id: 'p09',
        name: 'Ansell 5W GU10 LED Downlight',
        description: 'Fixed LED downlight, 5W GU10, 4000K, 450lm, IP20, white bezel.',
        category: 'Lighting',
        price: 14.75,
        image: 'img/downlight.svg'
    },
    {
        id: 'p10',
        name: 'MK Logic Plus 13A Twin Socket',
        description: 'Double 13A switched socket outlet, white moulded, surface/flush mount.',
        category: 'Wiring Accessories',
        price: 7.80,
        image: 'img/socket.svg'
    },
    {
        id: 'p11',
        name: 'Legrand Cat6 RJ45 Wall Socket',
        description: 'Single RJ45 Cat6 data socket, keystone insert, white, with backbox.',
        category: 'Wiring Accessories',
        price: 6.20,
        image: 'img/rj45.svg'
    },
    {
        id: 'p12',
        name: 'Wago 221-415 Lever Connector (5-way)',
        description: 'Push-in lever connector for solid and stranded conductors, 5-way, 32A.',
        category: 'Wiring Accessories',
        price: 2.15,
        image: 'img/wago.svg'
    }
];

const CATEGORIES = ['All', ...new Set(PRODUCTS.map(p => p.category))];

/** Returns an inline SVG string representing the product's category. */
function productIcon(category) {
    const icons = {
        'Cables': `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="30" width="80" height="8" rx="4" fill="#6b7280"/>
            <rect x="10" y="42" width="80" height="8" rx="4" fill="#003087"/>
            <rect x="10" y="54" width="80" height="8" rx="4" fill="#1a4db5"/>
            <rect x="8"  y="28" width="6"  height="36" rx="3" fill="#374151"/>
            <rect x="86" y="28" width="6"  height="36" rx="3" fill="#374151"/>
        </svg>`,
        'Circuit Protection': `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="30" y="15" width="40" height="70" rx="5" fill="#003087"/>
            <rect x="38" y="25" width="24" height="12" rx="2" fill="#e8401c"/>
            <rect x="42" y="44" width="16" height="4" rx="2" fill="#fff"/>
            <rect x="42" y="52" width="16" height="4" rx="2" fill="#fff"/>
            <rect x="42" y="60" width="16" height="4" rx="2" fill="#fff"/>
        </svg>`,
        'Lighting': `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="42" r="22" fill="#fbbf24"/>
            <rect x="40" y="64" width="20" height="6" rx="2" fill="#6b7280"/>
            <rect x="43" y="70" width="14" height="5" rx="2" fill="#9ca3af"/>
            <line x1="50" y1="10" x2="50" y2="18" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
            <line x1="22" y1="22" x2="28" y2="28" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
            <line x1="78" y1="22" x2="72" y2="28" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
            <line x1="10" y1="42" x2="18" y2="42" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
            <line x1="82" y1="42" x2="90" y2="42" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
        </svg>`,
        'Wiring Accessories': `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="15" y="25" width="70" height="50" rx="6" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"/>
            <circle cx="35" cy="50" r="8" fill="#fff" stroke="#6b7280" stroke-width="2"/>
            <circle cx="65" cy="50" r="8" fill="#fff" stroke="#6b7280" stroke-width="2"/>
            <rect x="46" y="35" width="8" height="5" rx="1" fill="#9ca3af"/>
        </svg>`
    };
    return icons[category] || icons['Wiring Accessories'];
}
