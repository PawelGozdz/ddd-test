# DomainTS LLM Tools - Structured Prompts

## 🔍 Tool 2: Component Analyzer

### Metadata
```yaml
name: "DomainTS Component Analyzer"
version: "1.0"
purpose: "Analyze existing code for DomainTS compliance and improvements"
input_format: "TypeScript code"
output_format: "Analysis report + recommendations"
```

### Workflow Template

```markdown
# 🔍 DOMAINIT COMPONENT ANALYZER

## INPUT SECTION
**Existing Code**: {{PASTE_CODE_HERE}}

## STEP 1: STRUCTURE ANALYSIS
Identify current architecture patterns:

### Code Structure Assessment:
```
**Detected Patterns**: [LIST_CURRENT_PATTERNS]
**DomainTS Components Found**: [LIST_DOMAINIT_COMPONENTS]
**Missing Components**: [LIST_MISSING_COMPONENTS]
**Architecture Style**: [CURRENT_ARCHITECTURE]
```

### Component Inventory:
- **Value Objects**: [FOUND/MISSING]
- **Entities**: [FOUND/MISSING]  
- **Aggregates**: [FOUND/MISSING]
- **Domain Events**: [FOUND/MISSING]
- **Repositories**: [FOUND/MISSING]
- **Domain Services**: [FOUND/MISSING]

## STEP 2: COMPLIANCE CHECK
Evaluate against DomainTS best practices:

### Best Practices Checklist:
- [ ] **Event-first design** (aggregates use apply() pattern)
- [ ] **Immutable value objects** (no setters, return new instances)
- [ ] **Proper error handling** (Result pattern used)
- [ ] **Repository abstractions** (interfaces over implementations)
- [ ] **Domain logic in domain** (not in application services)
- [ ] **Idempotent event handlers** (safe to replay)

### Compliance Score: [X/6] ✅

## STEP 3: ARCHITECTURE ASSESSMENT
Analyze current vs. recommended architecture:

### Current State:
[DESCRIBE_CURRENT_ARCHITECTURE]

### Recommended State:
[DESCRIBE_TARGET_ARCHITECTURE]

### Gap Analysis:
[LIST_ARCHITECTURE_GAPS]

## STEP 4: IMPROVEMENT RECOMMENDATIONS
Prioritized list of improvements:

### High Priority (Fix Now):
1. [CRITICAL_ISSUE_1]
2. [CRITICAL_ISSUE_2]

### Medium Priority (Next Sprint):
1. [IMPROVEMENT_1]
2. [IMPROVEMENT_2]

### Low Priority (Future):
1. [ENHANCEMENT_1]
2. [ENHANCEMENT_2]

## STEP 5: REFACTORING PLAN
Step-by-step migration strategy:

### Phase 1: Foundation
[FOUNDATION_STEPS]

### Phase 2: Core Domain
[DOMAIN_REFACTORING]

### Phase 3: Infrastructure
[INFRASTRUCTURE_IMPROVEMENTS]

### Phase 4: Advanced Patterns
[ADVANCED_FEATURES]

## STEP 6: CODE EXAMPLES
Show specific improvements with before/after:

### Before (Current):
```typescript
[CURRENT_CODE_EXAMPLE]
```

### After (Improved):
```typescript
[IMPROVED_CODE_EXAMPLE]
```

### Explanation:
```
[WHY_THIS_IS_BETTER]
```
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