package edu.easwari.erp.domain;

/**
 * OD and MEDICAL count as attended for the 75% eligibility calculation,
 * but are reported separately so the register stays honest.
 */
public enum AttendanceStatus {
    PRESENT, ABSENT, OD, MEDICAL;

    public boolean countsAsAttended() { return this != ABSENT; }
}
