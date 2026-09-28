package com.langfuse.quarkus;

import jakarta.enterprise.context.control.ActivateRequestContext;
import jakarta.inject.Inject;

import io.quarkus.runtime.QuarkusApplication;
import io.quarkus.runtime.annotations.QuarkusMain;

@QuarkusMain
public class Startup implements QuarkusApplication {
  @Inject
  PoemService service;

  @Override
  @ActivateRequestContext
  public int run(String... args) throws Exception {
    System.out.println(service.writeAPoem("LangFuse", 4));
    return 0;
  }
}