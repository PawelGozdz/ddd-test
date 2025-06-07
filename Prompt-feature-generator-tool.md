# DomainTS LLM Tools - Structured Prompts

## 🎯 Tool 1: Feature Generator

### Metadata
```yaml
name: "DomainTS Feature Generator"
version: "1.0"
purpose: "Generate complete feature implementations using DomainTS"
complexity_support: ["Basic", "Intermediate", "Advanced", "Expert", "Enterprise"]
output_format: "TypeScript + Setup Instructions"
```

### Workflow Template

```markdown
# 🎯 DOMAINIT FEATURE GENERATOR

## INPUT SECTION
**User Request**: {{USER_DESCRIPTION}}

## STEP 1: COMPLEXITY ANALYSIS
Analyze the request using DomainTS Decision Matrix:

### Assessment Criteria:
- **Data validation only** → Basic
- **CRUD with business rules** → Intermediate  
- **Complex workflows with events** → Advanced
- **Multi-context integration** → Expert
- **High-scale event processing** → Enterprise

### Analysis Output:
```
**Complexity Level**: [DETECTED_LEVEL]
**Primary Components**: [REQUIRED_COMPONENTS]
**Architecture Pattern**: [SELECTED_PATTERN]
**Optional Enhancements**: [ENHANCEMENT_SUGGESTIONS]
```

## STEP 2: COMPONENT SELECTION
Based on complexity level, select components from DomainTS compatibility matrix:

### Component Matrix:
- **Basic**: ValueObject + BusinessRuleValidator
- **Intermediate**: + Entity + Repository + Domain Events
- **Advanced**: + AggregateRoot + Domain Service + Unit of Work + Projections
- **Expert**: + Integration Events + Context Router + Anti-Corruption Layer
- **Enterprise**: + Enhanced Projections + Circuit Breaker + Outbox Pattern

### Selected Components:
```
PRIMARY: [LIST_PRIMARY_COMPONENTS]
SUPPORTING: [LIST_SUPPORTING_COMPONENTS]  
INFRASTRUCTURE: [LIST_INFRASTRUCTURE_COMPONENTS]
```

## STEP 3: TEMPLATE SELECTION
Choose appropriate template from Project Knowledge:

### Template Mapping:
- **Basic/Intermediate** → Template 1: Basic CRUD with Business Rules
- **Advanced** → Template 2: Complex Business Process (Event-Driven)
- **Expert/Enterprise** → Template 3: Multi-Context Integration

### Selected Template: [TEMPLATE_NAME]

## STEP 4: CODE GENERATION
Generate complete implementation using selected template and components:

### Structure:
1. **Value Objects** (if needed)
2. **Entities/Aggregates** (core domain)
3. **Domain Events** (if event-driven)
4. **Repository Interfaces** (persistence)
5. **Domain Services** (coordination logic)
6. **Integration Setup** (if multi-context)
7. **Usage Examples** (how to use)

### Implementation:
[GENERATE_COMPLETE_CODE_HERE]

## STEP 5: SETUP & CONFIGURATION
Provide setup instructions based on selected components:

### Infrastructure Setup:
[INFRASTRUCTURE_CONFIG]

### Integration Points:
[INTEGRATION_INSTRUCTIONS]

### Testing Strategy:
[TESTING_RECOMMENDATIONS]

## STEP 6: SCALING RECOMMENDATIONS
Suggest evolution path for the solution:

### Immediate Next Steps:
[SHORT_TERM_IMPROVEMENTS]

### Future Enhancements:
[LONG_TERM_EVOLUTION]

### Performance Considerations:
[PERFORMANCE_NOTES]
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