package com.agrolink.backend.util;

import java.util.regex.Pattern;

public class ValidationUtils {

    // NIC Regex: Support both legacy (9 digits + V/X) and modern (12 digits)
    private static final String NIC_REGEX = "^(([5,6,7,8,9]{1})([0-9]{1})([0,1,2,3,5,6,7,8]{1})([0-9]{6})([v|V|x|X]))|(([1,2]{1})([0,9]{1})([0-9]{2})([0,1,2,3,5,6,7,8]{1})([0-9]{7}))$";
    
    // Mobile Number Regex: Support 0, 94, +94 prefixes, followed by 7, operator prefix, and 7 digits
    private static final String MOBILE_REGEX = "^(?:0|94|\\+94)?7(0|1|2|4|5|6|7|8)\\d{7}$";

    // Postal Code: 5 digits
    private static final String POSTAL_CODE_REGEX = "^\\d{5}$";

    public static boolean isValidNIC(String nic) {
        if (nic == null) return false;
        return Pattern.matches(NIC_REGEX, nic);
    }

    public static boolean isValidMobile(String mobile) {
        if (mobile == null) return false;
        return Pattern.matches(MOBILE_REGEX, mobile);
    }

    public static boolean isValidPostalCode(String postalCode) {
        if (postalCode == null) return false;
        return Pattern.matches(POSTAL_CODE_REGEX, postalCode);
    }

    /**
     * Luhn Algorithm (Mod 10) for Card Validation
     */
    public static boolean isValidLuhn(String cardNumber) {
        if (cardNumber == null) return false;
        int sum = 0;
        boolean alternate = false;
        for (int i = cardNumber.length() - 1; i >= 0; i--) {
            int n = Integer.parseInt(cardNumber.substring(i, i + 1));
            if (alternate) {
                n *= 2;
                if (n > 9) {
                    n -= 9;
                }
            }
            sum += n;
            alternate = !alternate;
        }
        return (sum % 10 == 0);
    }

    /**
     * NIC Conversion Logic (Legacy to Modern)
     * Prefix '19', insert '0' before last 4 digits.
     */
    public static String convertToModernNIC(String legacyNic) {
        if (legacyNic == null || legacyNic.length() != 10) return legacyNic;
        String digits = legacyNic.substring(0, 9);
        return "19" + digits.substring(0, 5) + "0" + digits.substring(5);
    }
}
