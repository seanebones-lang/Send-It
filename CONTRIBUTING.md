# Contributing to Send-It

Thank you for your interest in contributing to Send-It! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 20+ and npm
- Git
- Basic knowledge of TypeScript, React, and Electron

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/Send-It.git
   cd Send-It
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

5. **Run tests**:
   ```bash
   npm test
   ```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer type inference where possible
- Use interfaces for object shapes
- Use enums for fixed sets of values
- Avoid `any` - use `unknown` if needed

### React

- Use functional components with hooks
- Use TypeScript for props
- Keep components small and focused
- Extract reusable logic into custom hooks

### General

- Follow existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Prefer composition over inheritance

## Testing Requirements

### Test Coverage

- Maintain **95%+ test coverage**
- Write tests for all new features
- Write tests for bug fixes
- Test edge cases and error scenarios

### Test Types

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test service interactions
3. **Component Tests**: Test React components with Testing Library
4. **IPC Tests**: Test IPC communication

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass**: `npm test`
2. **Ensure linting passes**: `npm run lint`
3. **Update documentation**: Update README.md if needed
4. **Update tests**: Add tests for new features
5. **Update types**: Add TypeScript types if needed

### PR Guidelines

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, maintainable code
   - Follow code style guidelines
   - Add tests for new features
   - Update documentation

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   **Commit Message Format**:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `test:` for test additions/changes
   - `refactor:` for code refactoring
   - `perf:` for performance improvements
   - `chore:` for maintenance tasks

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub:
   - Provide a clear description
   - Reference related issues
   - Add screenshots if UI changes
   - Wait for review and address feedback

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated
- [ ] Types added/updated
- [ ] No breaking changes (or documented)

## Development Guidelines

### Service Architecture

- Keep services focused and single-purpose
- Use dependency injection
- Prefer composition over inheritance
- Make services testable (mockable dependencies)

### Error Handling

- Use typed errors where possible
- Provide meaningful error messages
- Log errors appropriately
- Handle edge cases gracefully

### Performance

- Profile before optimizing
- Cache expensive operations
- Use indexes for database queries
- Optimize for common use cases

### Security

- Never commit secrets or tokens
- Use secure storage (Keytar) for credentials
- Validate all user input
- Use prepared statements for database queries
- Follow OWASP security best practices

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Explain non-obvious code decisions
- Update README.md for new features

### Type Documentation

- Use descriptive type names
- Add comments for complex types
- Document union types and enums
- Explain generic type parameters

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Detailed steps to reproduce
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: OS, Node version, Electron version
6. **Screenshots**: If applicable
7. **Logs**: Console errors or logs

### Feature Requests

When requesting features, please include:

1. **Use Case**: Why is this feature needed?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Alternative approaches considered
4. **Impact**: Who benefits from this feature?

## Code Review

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: Maintainers review code
3. **Feedback**: Address review comments
4. **Approval**: After approval, PR is merged

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] Performance is acceptable
- [ ] Security is considered
- [ ] No breaking changes

## Questions?

If you have questions:

- Check existing issues and PRs
- Ask in a GitHub issue
- Review the codebase for examples
- Check the documentation in `docs/`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Send-It! 🎉
