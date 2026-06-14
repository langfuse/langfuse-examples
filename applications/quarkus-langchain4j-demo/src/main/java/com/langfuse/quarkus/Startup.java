package com.langfuse.quarkus;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Singleton;

@Singleton
public class Startup {
    public void writeAPoem(@Observes StartupEvent event, MyAiService service) {
        System.out.println(service.writeAPoem("LangFuse", 4));
    }
}