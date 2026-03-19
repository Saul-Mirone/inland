Review all changed or newly added code in this repository for code style and quality issues. Check both staged and unstaged changes. For each issue found, report the file, line number, and which rule is violated. Skip issues already covered by `/review-effect` (Effect-TS specific anti-patterns).

## Checklist

### Code Smells

- Misleading Function Names: Functions doing things beyond what their name suggests
- Duplicated Code: Similar code in multiple locations with same calling context
- Long Parameter Lists: More than 3-4 parameters
- Complex Conditionals: Deep nesting (>3 levels)

### Naming Conventions

- Variable Names: Meaningful, pronounceable, searchable
- Consistency: Same concept = same name throughout

### SOLID Principles

- Single Responsibility: One responsibility to one actor
- Open/Closed: Open for extension, closed for modification
- Liskov Substitution: Subtypes must be substitutable
- Interface Segregation: No forced implementation of unused methods
- Dependency Inversion: Depend on abstractions, not concretions

### Clean Code Principles

- Comments: Code should be self-documenting
- Boundaries: Clear interfaces between modules
- Testability: Code structure that facilitates testing

### Design Patterns (GoF)

- Creational Patterns: Factory, Abstract Factory, Builder, Prototype, Singleton
- Structural Patterns: Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy
- Behavioral Patterns: Observer, Strategy, Command, State, Template Method, Chain of Responsibility

### Code Cleanup

- Typos: Spelling errors in variable names, comments, and strings
- Dead Code: Unused variables, functions, or imports
- Remove commented-out code blocks unless it serves a specific purpose

### Comment Only What the Code Cannot Say

- Apply the principle: "Comment what the code cannot say, not simply what it does not say"
- Remove redundant comments that simply repeat what the code already expresses
- Keep only comments that provide valuable context that cannot be expressed through code structure
- Ensure code is self-explanatory through clear naming and structure rather than excessive commenting

## Output Format

For each issue found, output:

- **File**: path and line number
- **Rule**: which rule number is violated
- **Problem**: what the code does wrong
- **Fix**: how to correct it

If no issues are found, confirm the code is clean.
