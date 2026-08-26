# Architecture Rules

## Responsibilities

- `miniapp/src/pages`: miniapp pages and navigation.
- `miniapp/src/features`: feature-local UI, state, styles, and tests.
- `miniapp/src/components`: shared presentation components.
- `miniapp/src/domain`: deterministic types and business rules.
- `miniapp/src/services`: HTTP, storage, Taro APIs, and external adapters.
- `server/src/http`: request parsing, authentication, and response mapping.
- `server/src/services`: server-side use-case coordination.
- `server/src/domain`: server-side models and rules.
- `server/src/repositories`: persistence contracts and implementations.

## Required boundaries

- Components do not directly call `Taro.request`, storage APIs, or server-only modules.
- Domain modules do not import React, Taro runtime globals, or services.
- New API calls go through a service module.
- New reusable behavior belongs in a hook or service, not a page component.
- A feature change must not silently become a global CSS change.

## Review questions

1. What layer owns the behavior?
2. Is the dependency direction one-way?
3. Can the rule be tested without a browser?
4. Is the change specific to one feature?
5. Does the feature document need updating?
