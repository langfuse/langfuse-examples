package com.langfuse.springai;

import io.micrometer.common.docs.KeyName;

public enum HighCardinalityKeyNames implements KeyName {
    PROMPT {
        public String asString() {
            return "gen_ai.prompt";
        }
    },
    COMPLETION {
        public String asString() { return "gen_ai.completion"; }
    }
}
