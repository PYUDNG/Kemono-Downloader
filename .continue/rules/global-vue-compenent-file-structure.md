---
globs: "**/*.vue"
description: 当创建和修改/src/components/下的自定义组件时，遵循以下文件结构
alwaysApply: true
---

对于/src/components/下的任何自定义组件`A`：
- 如果该组件独立存在且只有一个文件，则存储为`/src/components/A.vue`
- 如果该组件的实现包含多个文件：
  - 首先创建文件夹`/src/components/A/`
  - 将主文件（入口文件，应该为一个Vue SFC文件）存储为`/src/components/A/A.vue`
  - 对于任意其余文件`B`：
    - 如果该文件是一个`.vue`文件，则存放在`/src/components/A/components/`下
    - 如果该文件为一个`.ts`文件（如常见的`utils.ts`），则可以直接存放在`/src/components/A/`下
- 如果该组件不能独立存在，而是和一些其他组件共同工作，则为这些共同工作的组件创建一个单独的文件夹（以具有最高层级的组件名命名此文件夹），然后将所有这些组件按照前述结构存储在文件夹内（关于这一条，如有不清楚处，可列出`/src/components/TabLayout/`内的文件结构以供参考）