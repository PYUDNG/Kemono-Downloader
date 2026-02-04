---
globs: "**/*.vue"
description: 当创建或修改支持 v-model 的 Vue 组件时，使用 defineModel 来简化双向数据绑定逻辑
alwaysApply: false
---

在 Vue 3.4+ 中，对于支持 v-model 的组件，优先使用 defineModel 宏来简化 prop 和 emit 的处理。defineModel 会自动创建 modelValue prop 和 update:modelValue emit，并返回一个可以直接在模板中使用的响应式引用。