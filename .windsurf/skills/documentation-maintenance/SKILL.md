---
name: documentation-maintenance
description: Maintaining comprehensive documentation including API specs, architecture docs, and testing guides
---

# Documentation Maintenance

This skill covers maintaining comprehensive documentation in the Spa-Flow repository including API specs, architecture docs, and testing guides.

## Key Concepts

### OpenAPI Specification Maintenance
- Update `lib/api-spec/openapi.yaml` with API changes
- Document all endpoints
- Include request/response schemas
- Add examples
- Document authentication requirements

### Architecture Documentation Updates
- Update `docs/architecture.md` for design changes
- Document architectural decisions
- Update data flow diagrams
- Document component interactions
- Keep architecture docs current

### Testing Strategy Documentation
- Update `docs/testing-strategy.md` for test changes
- Document test patterns
- Update test tagging conventions
- Document test ownership
- Keep testing docs aligned with code

### Security Documentation
- Update `docs/security-posture.md` for security changes
- Document threat model
- Update encryption details
- Document security decisions
- Keep security docs current

### API Changelog Maintenance
- Update `docs/api-changelog.md` for API changes
- Document breaking changes
- Version history
- Migration guides
- Deprecation notices

### Placeholder Value Resolution
- Resolve TODO placeholders
- Fill in missing documentation
- Update outdated information
- Remove obsolete sections
- Complete incomplete docs

### Known Issue Documentation
- Document known issues
- Track workarounds
- Link to related tickets
- Update when issues resolved
- Maintain issue tracker

### Documentation Consistency
- Consistent formatting across docs
- Use markdown consistently
- Maintain table of contents
- Cross-reference related docs
- Keep terminology consistent

## Key Files
- `docs/` - All documentation files
- `lib/api-spec/openapi.yaml` - API specification
- `ANALYSIS.md` - Repository analysis
- `AGENTS.md` - Operating rules

## References
- `README.md` - Documentation index
- TODO.md TASK-027 - Documentation placeholder updates

## Common Tasks

### Updating OpenAPI Spec
1. Add new endpoint to openapi.yaml
2. Document request/response schemas
3. Add examples
4. Update version if breaking change
5. Regenerate API client

### Adding New Documentation
1. Create markdown file in `docs/`
2. Add frontmatter if needed
3. Write comprehensive content
4. Add to README.md index
5. Link from related docs

### Updating Documentation
1. Read existing documentation
2. Identify outdated information
3. Update with current state
4. Verify accuracy
5. Commit with clear message

### Resolving Placeholders
1. Search for TODO/FIXME in docs
2. Resolve each placeholder
3. Add missing information
4. Remove placeholder markers
5. Verify completeness

## Best Practices
- Keep docs in sync with code
- Update docs when code changes
- Use clear, concise language
- Include examples where helpful
- Cross-reference related documentation
