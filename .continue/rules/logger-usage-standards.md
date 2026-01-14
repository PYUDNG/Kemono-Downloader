---
description: This rule should be applied when creating or modifying any module
  that uses logging. It ensures that all log output includes proper module
  context for easier debugging.
alwaysApply: false
---

Always use logger.withPath() to create a module-specific logger instance instead of using the global logger directly. Each module should have its own logger with a path that identifies the module.