export const validationRules = {
    // NIC Regex: Support both legacy (9 digits + V/X) and modern (12 digits)
    nic: /^([0-9]{9}[vVxX]|[0-9]{12})$/,
    
    // Mobile Number Regex: Support 0, 94, +94 prefixes, followed by 7, operator prefix, and 7 digits
    mobile: /^(?:0|94|\+94)?7(0|1|2|4|5|6|7|8)\d{7}$/,

    // Postal Code: 5 digits
    postalCode: /^\d{5}$/,

    // Card Number: Luhn algorithm
    luhn: (cardNumber) => {
        if (!cardNumber) return false;
        let sum = 0;
        let alternate = false;
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let n = parseInt(cardNumber[i], 10);
            if (alternate) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
            alternate = !alternate;
        }
        return (sum % 10 === 0);
    }
};

export const sriLankanAdmin = {
    provinces: [
        { name: "Western", code: "WP", districts: ["Colombo", "Gampaha", "Kalutara"] },
        { name: "Central", code: "CP", districts: ["Kandy", "Matale", "Nuwara Eliya"] },
        { name: "Southern", code: "SP", districts: ["Galle", "Matara", "Hambantota"] },
        { name: "North Western", code: "NWP", districts: ["Kurunegala", "Puttalam"] },
        { name: "North Central", code: "NCP", districts: ["Anuradhapura", "Polonnaruwa"] },
        { name: "Northern", code: "NP", districts: ["Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu"] },
        { name: "Eastern", code: "EP", districts: ["Trincomalee", "Batticaloa", "Ampara"] },
        { name: "Uva", code: "UP", districts: ["Badulla", "Monaragala"] },
        { name: "Sabaragamuwa", code: "SGP", districts: ["Ratnapura", "Kegalle"] }
    ]
};
