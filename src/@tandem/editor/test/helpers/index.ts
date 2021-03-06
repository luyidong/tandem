// import "reflect-metadata";
// TODO - giant mess of a setup here. This is okay for now as
// the internal API matures along with extensions. However, it *may* be good
// to modularize this piece of code later so that it's not so specific to certain libraries
// such as typescript, and sass.

import path =  require("path");
import { createSASSSandboxProviders } from "@tandem/sass-extension";
import { createJavaScriptSandboxProviders } from "@tandem/commonjs-extension";
import { createTypescriptEditorWorkerProviders } from "@tandem/typescript-extension/editor/worker";
import { MarkupEditor, createSyntheticHTMLProviders } from "@tandem/synthetic-browser";
import { createTestSandboxProviders, ISandboxTestProviderOptions } from "@tandem/sandbox/test/helpers";
import { createCommonEditorProviders, ConsoleLogService, ReceiverService } from "@tandem/editor/common";

import { 
  Kernel, 
  LogLevel, 
  LogEvent, 
  BrokerBus, 
  Application, 
  HTML_MIME_TYPE, 
  KernelProvider, 
  PrivateBusProvider, 
  ServiceApplication,
  ApplicationServiceProvider,
  ApplicationConfigurationProvider,
} from "@tandem/common";

import { WebpackDependencyGraphStrategy, DependencyGraphStrategyProvider, ProtocolURLResolverProvider, WebpackProtocolResolver, FileCacheProvider, ContentEditorFactoryProvider } from "@tandem/sandbox";

/**
 * creates a test master application that includes everything from the front-end
 * back-end, and workers.
 */

export interface IMasterTestAppicationOptions {
  log?: {
    level: LogLevel
  };
  typescript?: boolean;
  sandboxOptions?: ISandboxTestProviderOptions;
  createTestProviders?: () => any;
}

export const createTestMasterApplication = (options: IMasterTestAppicationOptions = {}) => {
  const bus = new BrokerBus();

  const kernel = new Kernel(
    createTestSandboxProviders(options.sandboxOptions),
    new KernelProvider(),
    new PrivateBusProvider(bus),
    createSASSSandboxProviders(),
    createSyntheticHTMLProviders(),
    new ApplicationServiceProvider("console", ConsoleLogService),
    new ApplicationServiceProvider("receiver", ReceiverService),
    createJavaScriptSandboxProviders(),
    options.typescript !== false ? createTypescriptEditorWorkerProviders() : [],
    new ApplicationConfigurationProvider(options),
    new ContentEditorFactoryProvider(HTML_MIME_TYPE, MarkupEditor),
    new DependencyGraphStrategyProvider("webpack", WebpackDependencyGraphStrategy),
    new ProtocolURLResolverProvider("webpack", WebpackProtocolResolver),
  );

  if (options.createTestProviders) {
    kernel.register(options.createTestProviders());
  }

  FileCacheProvider.getInstance(kernel).syncWithLocalFiles();

  return new ServiceApplication(kernel);
}


export const createRandomFileName = (extension: string) => {
  return path.join(process.cwd(), String(Date.now()) + "." + extension);
}

export const removeWhitespace = (value: string) => {
  return value.replace(/[\s\r\n\t]+/g, "");
}