For your Bhalyam project, I would not call this a "thinking framework". I would formalize it as an Engineering Operating System (EOS) that every AI agent must follow before generating requirements, code, architecture, audits, reviews, refactors, bug fixes, or implementation plans.

Copy-paste this directly into your AGENTS.md, CLAUDE.md, GEMINI.md, COPILOT_INSTRUCTIONS.md, or Antigravity custom instructions.

BHALYAM ENGINEERING OPERATING SYSTEM (EOS)
PRIMARY OBJECTIVE

Generate production-grade solutions that remain maintainable, scalable, secure, accessible, performant, and extensible for the next 10+ years.

Never optimize for speed of implementation at the expense of architecture quality.

Always think like:

Principal Software Engineer
Staff Frontend Architect
Product Designer
QA Engineer
Accessibility Specialist
Security Reviewer
Performance Engineer

before producing the final answer.

PHASE 1: REQUIREMENT ANALYSIS

Before proposing any solution:

Analyze:

Business objective
User objective
Functional requirements
Non-functional requirements
Technical constraints
Future scalability needs
Existing architecture impact
Backward compatibility impact

Questions to internally answer:

Why is this feature needed?
Who uses it?
What problem does it solve?
What could fail?
PHASE 2: SYSTEM IMPACT ANALYSIS

Identify impact on:

Frontend
Backend
API contracts
Database
Authentication
Authorization
Caching
Monitoring
Analytics
Deployment

Review:

Coupling
Dependencies
Technical debt
Upgrade paths
PHASE 3: USER EXPERIENCE REVIEW

Verify:

First-time user experience
Power-user experience
Accessibility experience
Mobile experience
Tablet experience
Desktop experience

Review:

Navigation clarity
Discoverability
Error recovery
Empty states
Loading states
Success states

Reject solutions that create confusion.

PHASE 4: RESPONSIVE DESIGN REVIEW

Validate:

320px mobile
375px mobile
768px tablet
1024px laptop
1440px desktop
Ultra-wide displays

Check:

Overflow issues
Layout breaks
Fixed widths
Truncation problems
Touch targets
Orientation changes

No desktop-first implementations.

Must be mobile-first.

PHASE 5: ACCESSIBILITY REVIEW

Ensure:

WCAG compliance
Keyboard navigation
Screen reader support
Focus management
ARIA attributes
Color contrast

Reject designs that rely only on color.

Every user action must be accessible without a mouse.

PHASE 6: EDGE CASE ANALYSIS

Identify:

User Edge Cases
Rapid clicking
Double submissions
Refresh during action
Multiple tabs
Abandoned workflows
Data Edge Cases
Empty data
Huge datasets
Corrupted data
Partial responses
Network Edge Cases
Slow network
Offline mode
Retry scenarios
Timeouts
Platform Edge Cases
Mobile browser quirks
Safari issues
Chrome issues
Firefox issues

Never assume happy-path behavior.

PHASE 7: PERFORMANCE REVIEW

Evaluate:

Re-renders
Bundle size
Memory consumption
Network requests
API efficiency
Caching opportunities

Optimize:

React rendering
Component structure
Memoization
Data loading
Virtualization

Avoid premature optimization.

Apply optimization where measurable benefit exists.

PHASE 8: SECURITY REVIEW

Inspect:

XSS
CSRF
Injection risks
Sensitive data exposure
Authorization flaws
Authentication flaws

Validate:

User input
API payloads
File uploads
Query parameters

Never trust client-side validation alone.

PHASE 9: MAINTAINABILITY REVIEW

Verify:

Readability
Separation of concerns
Reusability
Testability
Scalability

Avoid:

Magic values
Tight coupling
Duplicate logic
Deep nesting
Large components

Code should be understandable by a new engineer in under 30 minutes.

PHASE 10: FUTURE SCALABILITY REVIEW

Consider:

10x users
10x data volume
10x traffic

Verify:

Architecture longevity
Extensibility
Configuration-driven design
Feature toggles
Modular structure

Avoid solutions requiring major rewrites later.

PHASE 11: PRODUCTION READINESS REVIEW

Verify:

Logging
Error logging
Audit logging
Diagnostic logging
Monitoring
Health checks
Metrics
Alerting
Reliability
Fail-safe behavior
Recovery mechanisms
Retry handling
Deployment
Rollback strategy
Migration strategy
Release safety

No implementation is complete without operational readiness.

PHASE 12: SELF-CRITIQUE PHASE

Before producing the final answer:

Act as an independent Principal Engineer.

Critique your own solution.

Ask:

Architecture Review
Is architecture over-engineered?
Is architecture under-engineered?
Can it scale?
UX Review
Will users understand it?
Is onboarding easy?
Is navigation intuitive?
Frontend Review
Any React anti-patterns?
Any state-management problems?
Any rendering issues?
Backend Review
Any API risks?
Any data consistency concerns?
Any concurrency issues?
Accessibility Review
Can keyboard users complete all actions?
Can screen readers understand the interface?
Performance Review
Potential bottlenecks?
Expensive calculations?
Large renders?
Security Review
Any attack surfaces?
Any missing validations?
Long-Term Review
Will this become technical debt?
Will engineers hate maintaining it after 5 years?

If any answer is "Yes", improve the solution before returning it.

FINAL OUTPUT VALIDATION

Before submitting any answer, verify:

Requirement Complete
Mobile Responsive
Accessibility Compliant
Edge Cases Covered
Performance Reviewed
Security Reviewed
Maintainability Reviewed
Scalability Reviewed
Production Ready
Self-Critique Passed

Only then generate the final response.

BHALYAM-SPECIFIC RULE

For every implementation, additionally evaluate:

Gaming UX
Touch interactions
Keyboard controls
Small-screen playability
High-latency networks
Session recovery
Local storage recovery
Competitive fairness
Animation performance
Low-end Android devices
Future game extensibility
Shared platform architecture
Design consistency across all games

Never implement a feature that improves one game while degrading the overall platform experience.