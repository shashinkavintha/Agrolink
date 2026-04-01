package com.agrolink.backend.util;

import java.security.MessageDigest;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

public class PayHereUtility {

    public static String generateHash(String merchantId, String orderId, double amount, String currency,
            String merchantSecret) {

        DecimalFormat df = new DecimalFormat("0.00", new DecimalFormatSymbols(Locale.US));
        String formattedAmount = df.format(amount);

        String secretHash = getMd5(merchantSecret).toUpperCase();
        String decodedSecret = merchantSecret; // raw secret for log

        String hashString = merchantId + orderId + formattedAmount + currency + secretHash;

        System.err.println("===== PAYHERE DEBUG LOG =====");
        System.err.println("Merchant ID: " + merchantId);
        System.err.println("Order ID: " + orderId);
        System.err.println("Amount: " + formattedAmount);
        System.err.println("Currency: " + currency);
        System.err.println("Decoded Secret: " + decodedSecret);
        System.err.println("Secret Hash (MD5 of decoded): " + secretHash);
        System.err.println("Hash Input String: " + hashString);
        String finalHash = getMd5(hashString).toUpperCase();
        System.err.println("Final Hash: " + finalHash);
        System.err.println("=============================");

        return finalHash;
    }

    public static String getMd5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] messageDigest = md.digest(input.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : messageDigest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error generating MD5 hash", e);
        }
    }
}
