package edu.easwari.erp.service;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class TempPasswordsTest {

    @Test
    void tenCharactersOfLettersAndDigitsWithoutLookAlikes() {
        for (int i = 0; i < 2000; i++) {
            String p = TempPasswords.generate();
            assertThat(p).hasSize(10)
                    .matches("[A-Za-z2-9]+")
                    .doesNotContainPattern("[0O1lIo]")
                    .containsPattern("[A-Za-z]")
                    .containsPattern("[2-9]");
        }
    }

    @Test
    void passwordsAreNotRepeated() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 2000; i++) seen.add(TempPasswords.generate());
        assertThat(seen).hasSize(2000);
    }
}
