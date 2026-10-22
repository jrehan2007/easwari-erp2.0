package edu.easwari.erp.service;

import java.security.SecureRandom;

/**
 * One-time passwords for new accounts. Read aloud or copied off a screen, so the
 * alphabet drops look-alikes (0/O/o, 1/l/I). Always mixes letters and digits.
 */
public final class TempPasswords {

    public static final int LENGTH = 10;
    static final String LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
    static final String DIGITS = "23456789";
    private static final String ALL = LETTERS + DIGITS;
    private static final SecureRandom RANDOM = new SecureRandom();

    private TempPasswords() {}

    public static String generate() {
        char[] out = new char[LENGTH];
        for (int i = 0; i < LENGTH; i++) out[i] = ALL.charAt(RANDOM.nextInt(ALL.length()));
        // Guarantee at least one of each kind, at random positions.
        int letterAt = RANDOM.nextInt(LENGTH);
        int digitAt = (letterAt + 1 + RANDOM.nextInt(LENGTH - 1)) % LENGTH;
        out[letterAt] = LETTERS.charAt(RANDOM.nextInt(LETTERS.length()));
        out[digitAt] = DIGITS.charAt(RANDOM.nextInt(DIGITS.length()));
        return new String(out);
    }
}
