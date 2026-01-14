---
description: "This rule should be applied when importing and using logger in any
  module. It ensures consistent naming: globalLogger for the imported global
  instance, and logger for the module-specific instance."
alwaysApply: false
---

When importing logger, rename the global logger import to 'globalLogger' and create a module-specific logger using 'const logger = globalLogger.withPath(moduleName)'. The module-specific logger should be named 'logger' for consistency within the module.