package edu.easwari.erp.domain;

/**
 * Theory assessments first; the LAB_ types are the internal components of a
 * practical (laboratory) course. Kept in one enum so marks entry and the
 * publish gate work the same for both.
 */
public enum AssessmentType {
    IA1, IA2, ASSIGNMENT, MODEL_EXAM, UNIT_TEST, GROUP_PRESENTATION,
    LAB_OBSERVATION, LAB_RECORD, LAB_MODEL_EXAM, LAB_VIVA;

    public boolean isPractical() { return name().startsWith("LAB_"); }
}
