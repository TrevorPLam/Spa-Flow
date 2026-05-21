---
trigger: model_decision
globs: **/*auth*.ts
---

# Password Hashing Best Practices (2026)

## Current State
- Spa-Flow uses bcryptjs 2.4.3 for password hashing
- Cost factor: 7 rounds (bcrypt default)

## 2026 Best Practices
- **OWASP Recommendation**: Argon2id is the preferred password hashing algorithm as of 2026
- Argon2id is memory-hard, making GPU/ASIC attacks significantly more expensive
- bcrypt remains acceptable for legacy systems but Argon2id is the modern standard

## Migration Path
- If considering password hashing algorithm changes:
  - **⚠️ Ask First**: Migrating from bcrypt to Argon2id requires careful planning
  - Must implement a gradual migration strategy (hash on successful login)
  - Cannot bulk rehash all passwords (bcrypt hashes are not reversible)
  - Maintain dual-support during transition period

## Configuration Requirements
If using Argon2id:
- Memory cost: 64MB (minimum for 2026 security standards)
- Time cost: 2-3 iterations
- Parallelism: 4 threads
- Salt length: 16 bytes minimum

## Current bcrypt Configuration (If Staying with bcrypt)
- Cost factor should be at least 10-12 for 2026 security standards
- Current cost of 7 is too low for production security
- **⚠️ Ask First**: Increasing bcrypt cost factor requires rehashing all passwords

## Security Requirements
- **✅ Always Do**: Use unique salt per password (bcrypt/Argon2id handle this automatically)
- **✅ Always Do**: Never store passwords in plain text
- **✅ Always Do**: Never use MD5, SHA1, SHA256 for password hashing (too fast)
- **❌ Never Do**: Implement custom password hashing algorithms
- **❌ Never Do**: Remove salting from password hashing

## References
- OWASP Password Storage Cheat Sheet (2026)
- "Password Hashing in 2026" - InkyVoxel
