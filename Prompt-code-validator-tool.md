# DomainTS LLM Tools - Structured Prompts

## ✅ Tool 3: Code Validator

### Metadata
```yaml
name: "DomainTS Code Validator"
version: "1.0"
purpose: "Validate code compliance with DomainTS patterns and best practices"
validation_categories: ["Architecture", "Patterns", "Performance", "Maintainability"]
output_format: "Compliance report + specific fixes"
```

### Workflow Template

```markdown
# ✅ DOMAINIT CODE VALIDATOR

## INPUT SECTION
**Code to Validate**: {{PASTE_CODE_HERE}}

## STEP 1: PATTERN VALIDATION
Check implementation of DomainTS patterns:

### Value Objects Validation:
- [ ] **Immutability**: No setters, properties are readonly
- [ ] **Validation**: Constructor validates input
- [ ] **Equality**: Implements proper equals method
- [ ] **Type Safety**: Proper TypeScript generics

**Issues Found**: [LIST_VALUE_OBJECT_ISSUES]

### Entity/Aggregate Validation:
- [ ] **Identity**: Proper ID management with EntityId<T>
- [ ] **Encapsulation**: Private state, public behavior
- [ ] **Event Sourcing**: Uses apply() pattern for state changes
- [ ] **Invariants**: Business rules enforced in domain

**Issues Found**: [LIST_ENTITY_ISSUES]

### Event System Validation:
- [ ] **Event Design**: Events are immutable records of what happened
- [ ] **Naming**: Past tense naming (OrderCreated, not CreateOrder)
- [ ] **Payload**: Contains all necessary data
- [ ] **Handlers**: Idempotent and side-effect free

**Issues Found**: [LIST_EVENT_ISSUES]

## STEP 2: BEST PRACTICES CHECK
Validate against DomainTS best practices:

### Architecture Validation:
- [ ] **Domain Logic Location**: Business logic in domain, not application layer
- [ ] **Layer Separation**: Clear boundaries between layers
- [ ] **Dependency Direction**: Dependencies point toward domain
- [ ] **Result Pattern**: Proper error handling without exceptions

### Performance Validation:
- [ ] **Event Handler Efficiency**: No N+1 queries, batch operations
- [ ] **Projection Optimization**: Snapshots and checkpoints where appropriate
- [ ] **Caching Strategy**: Appropriate caching for expensive operations
- [ ] **Resource Management**: Proper disposal and cleanup

### Maintainability Validation:
- [ ] **Code Organization**: Clear module boundaries
- [ ] **Testing Strategy**: Unit tests for domain logic
- [ ] **Documentation**: Self-documenting code with clear names
- [ ] **Type Safety**: Full TypeScript utilization

## STEP 3: COMPLIANCE SCORING
Calculate overall compliance score:

### Category Scores:
- **Pattern Implementation**: [X/10] ⭐
- **Best Practices**: [X/10] ⭐
- **Performance**: [X/10] ⭐
- **Maintainability**: [X/10] ⭐

### Overall Score: [X/40] ⭐⭐⭐⭐⭐

## STEP 4: CRITICAL ISSUES
Identify and prioritize fixes:

### 🚨 Critical (Fix Immediately):
1. [CRITICAL_ISSUE_1]
   - **Problem**: [DESCRIPTION]
   - **Impact**: [IMPACT_DESCRIPTION]
   - **Fix**: [SPECIFIC_FIX]

### ⚠️ Warning (Fix Soon):
1. [WARNING_ISSUE_1]
   - **Problem**: [DESCRIPTION]
   - **Fix**: [SPECIFIC_FIX]

### 💡 Suggestion (Consider):
1. [SUGGESTION_1]
   - **Improvement**: [DESCRIPTION]
   - **Benefit**: [BENEFIT_DESCRIPTION]

## STEP 5: DETAILED FIXES
Provide specific code fixes:

### Fix #1: [ISSUE_NAME]
**Current Code**:
```typescript
[PROBLEMATIC_CODE]
```

**Fixed Code**:
```typescript
[CORRECTED_CODE]
```

**Explanation**: [WHY_THIS_FIX]

### Fix #2: [ISSUE_NAME]
[REPEAT_PATTERN]

## STEP 6: VALIDATION SUMMARY
Final report and next steps:

### ✅ Strengths:
[LIST_POSITIVE_ASPECTS]

### 🔧 Areas for Improvement:
[LIST_IMPROVEMENT_AREAS]

### 📈 Recommended Actions:
1. [ACTION_1]
2. [ACTION_2]
3. [ACTION_3]

### 🎯 Success Metrics:
- Target compliance score: 35+/40
- Zero critical issues
- All best practices followed


---

## 🔧 Tool Usage Instructions

### How to Use These Tools:

1. **Copy the appropriate tool template**
2. **Replace {{PLACEHOLDERS}} with actual content**
3. **Follow the step-by-step workflow**
4. **Use Project Knowledge as reference for decisions**

### Tool Selection Guide:

- **Feature Generator**: When building new functionality from scratch
- **Component Analyzer**: When evaluating existing codebase
- **Code Validator**: When checking specific code for compliance

### Integration with Project Knowledge:

All tools reference:
- **Decision Matrix** for complexity assessment
- **Component Reference** for technical details
- **Templates** for code generation
- **Best Practices** for validation rules
- **Anti-Patterns** for issue detection

### Output Quality Standards:

- **Complete implementations** with full TypeScript typing
- **Production-ready code** following DomainTS patterns
- **Clear explanations** of architectural decisions
- **Actionable recommendations** for improvements
- **Scalable solutions** that can grow with requirements