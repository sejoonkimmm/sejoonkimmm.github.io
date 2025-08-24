---
title: "TypeScript Best Practices for Modern Development"
description: "Essential TypeScript patterns and practices for building robust applications"
cover_image: "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800&h=400&fit=crop&crop=center"
date: "2024-02-01"
readTime: "6 min read"
tags: ["TypeScript", "Best Practices", "JavaScript"]
---

# TypeScript Best Practices for Modern Development

TypeScript has become essential for modern JavaScript development. Here are the best practices that will help you write more maintainable and robust code.

## Type Definitions

### Interface vs Type Aliases

Use interfaces for object shapes that might be extended:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminUser extends User {
  permissions: string[];
}
```

Use type aliases for unions, primitives, and computed types:

```typescript
type Status = 'loading' | 'success' | 'error';
type UserId = string;
```

### Generic Types

Create reusable, type-safe components:

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  return fetch(url).then(res => res.json());
}
```

## Utility Types

TypeScript provides powerful utility types:

```typescript
// Pick specific properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Make properties optional
type PartialUser = Partial<User>;

// Make properties required
type RequiredUser = Required<User>;

// Omit properties
type UserWithoutEmail = Omit<User, 'email'>;
```

## Strict Configuration

Enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## Error Handling

Use discriminated unions for error handling:

```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

function processUser(user: User): Result<ProcessedUser> {
  try {
    const processed = transformUser(user);
    return { success: true, data: processed };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## React with TypeScript

### Component Props

```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false 
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

### Hooks with TypeScript

```typescript
const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
};
```

## Advanced Patterns

### Branded Types

Create nominal types for better type safety:

```typescript
type UserId = string & { __brand: 'UserId' };
type PostId = string & { __brand: 'PostId' };

const createUserId = (id: string): UserId => id as UserId;
const createPostId = (id: string): PostId => id as PostId;
```

### Template Literal Types

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = `/api/${string}`;
type ApiUrl = `${HttpMethod} ${ApiEndpoint}`;

// Usage: "GET /api/users" | "POST /api/users" etc.
```

## Conclusion

These TypeScript best practices will help you build more robust, maintainable applications. Start with strict configuration and gradually adopt advanced patterns as your codebase grows.