/**
 * Hi-OS v1.0 Attempt Guard System
 * Implements 2-attempt rule with auto failure logging
 */

import fs from 'fs/promises';
import path from 'path';

const ATTEMPTS_FILE = './reports/.attempts.json';
const FAILURE_LOG_TEMPLATE = './reports/FAILURE_LOG.md';

/**
 * Ensure reports directory exists
 */
async function ensureReportsDir() {
    try {
        await fs.mkdir('./reports', { recursive: true });
    } catch (error) {
        // Directory already exists, ignore
    }
}

/**
 * Load attempt tracking data
 */
async function loadAttempts() {
    try {
        const data = await fs.readFile(ATTEMPTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // File doesn't exist or is invalid, return empty object
        return {};
    }
}

/**
 * Save attempt tracking data
 */
async function saveAttempts(attempts) {
    await ensureReportsDir();
    await fs.writeFile(ATTEMPTS_FILE, JSON.stringify(attempts, null, 2));
}

/**
 * Get console excerpts from recent logs
 */
function getConsoleExcerpts() {
    // In a real implementation, this would capture recent console output
    // For now, return a placeholder
    return [
        "// Recent console output would be captured here",
        "// This could integrate with logging systems",
        "// Or capture stderr/stdout from recent operations"
    ].join('\n');
}

/**
 * Generate failure log content
 */
function generateFailureLog(taskId, attempts, context = {}) {
    const timestamp = new Date().toISOString();
    const attemptHistory = attempts[taskId] || [];
    
    return `# Task Failure Report

**Generated**: ${timestamp}
**Task ID**: ${taskId}
**Attempt Count**: ${attemptHistory.length}

## Task
${context.task || 'Task description not provided'}

## Context (phase, branch, tag)
- **Branch**: ${context.branch || 'Unknown'}
- **Phase**: ${context.phase || 'Unknown'}
- **Tag**: ${context.tag || 'Unknown'}
- **Hi-OS Version**: v1.0

## Steps taken (attempt 1 & 2)
### Attempt History
${attemptHistory.map((attempt, index) => `
**Attempt ${index + 1}** (${new Date(attempt.timestamp).toLocaleString()})
- Status: ${attempt.status}
- Duration: ${attempt.duration || 'Unknown'}ms
- Context: ${attempt.context || 'No additional context'}
`).join('\n')}

## Console excerpts
\`\`\`
${getConsoleExcerpts()}
\`\`\`

## Preflight result
${context.preflightResult || 'Preflight result not captured'}

## Proposed remediation
Based on the failure pattern, consider these steps:

1. **Root Cause Analysis**
   - Review the specific error messages above
   - Check if this is a systemic issue or isolated failure
   - Verify all Hi-OS preflight checks pass

2. **Immediate Actions**
   - Reset local environment: \`git clean -fd && npm install\`
   - Run full preflight: VS Code task "Hi-OS: Preflight"
   - Check for conflicting processes or file locks

3. **Systematic Approach**
   - Break task into smaller, atomic operations
   - Add intermediate verification steps
   - Consider feature flag rollout for risky changes

4. **Prevention**
   - Update task documentation with lessons learned
   - Add specific preflight checks for this failure mode
   - Consider automation for repeated manual steps

## Next Steps
- [ ] Address root cause identified above
- [ ] Verify preflight passes completely
- [ ] Test fix in isolation before retry
- [ ] Update task templates to prevent similar failures
- [ ] Document any new guardrails or checks needed

---
**Hi-OS v1.0**: Auto-generated failure analysis for continuous improvement.
`;
}

/**
 * Record a task attempt
 * @param {string} taskId - Unique identifier for the task
 * @param {string} status - 'success' or 'fail'
 * @param {object} context - Additional context about the attempt
 */
export async function recordAttempt(taskId, status, context = {}) {
    await ensureReportsDir();
    
    const attempts = await loadAttempts();
    
    if (!attempts[taskId]) {
        attempts[taskId] = [];
    }
    
    const attempt = {
        timestamp: Date.now(),
        status,
        context: context.description || '',
        duration: context.duration || null,
        preflightResult: context.preflightResult || null
    };
    
    attempts[taskId].push(attempt);
    
    // Check if we've hit the 2-attempt rule
    const failureCount = attempts[taskId].filter(a => a.status === 'fail').length;
    
    if (failureCount >= 2 && status === 'fail') {
        console.log(`🚨 2-Attempt rule triggered for task: ${taskId}`);
        
        // Generate failure log
        const failureLogContent = generateFailureLog(taskId, attempts, {
            task: context.taskDescription || `Task ${taskId}`,
            branch: context.branch || 'unknown',
            phase: context.phase || 'unknown', 
            tag: context.tag || 'unknown',
            preflightResult: context.preflightResult || 'Not captured'
        });
        
        const failureLogPath = `./reports/FAILURE_LOG_${taskId}_${Date.now()}.md`;
        await fs.writeFile(failureLogPath, failureLogContent);
        
        console.log(`📋 Failure log created: ${failureLogPath}`);
        console.log('🛑 STOP: Fix root cause before continuing');
        
        return {
            shouldStop: true,
            failureLogPath,
            attemptCount: failureCount
        };
    }
    
    await saveAttempts(attempts);
    
    return {
        shouldStop: false,
        attemptCount: attempts[taskId].length,
        failureCount
    };
}

/**
 * Get attempt history for a task
 */
export async function getAttemptHistory(taskId) {
    const attempts = await loadAttempts();
    return attempts[taskId] || [];
}

/**
 * Clear attempt history for a task (use after successful completion)
 */
export async function clearAttemptHistory(taskId) {
    const attempts = await loadAttempts();
    delete attempts[taskId];
    await saveAttempts(attempts);
}

/**
 * Get all tasks with failures
 */
export async function getFailedTasks() {
    const attempts = await loadAttempts();
    const failed = {};
    
    for (const [taskId, taskAttempts] of Object.entries(attempts)) {
        const failures = taskAttempts.filter(a => a.status === 'fail');
        if (failures.length > 0) {
            failed[taskId] = {
                totalAttempts: taskAttempts.length,
                failures: failures.length,
                lastFailure: failures[failures.length - 1]
            };
        }
    }
    
    return failed;
}

/**
 * Hi-OS integration helper - automatically track common operations
 */
export class HiOSTaskTracker {
    constructor(taskId, context = {}) {
        this.taskId = taskId;
        this.context = context;
        this.startTime = Date.now();
    }
    
    async success(context = {}) {
        const duration = Date.now() - this.startTime;
        return await recordAttempt(this.taskId, 'success', {
            ...this.context,
            ...context,
            duration
        });
    }
    
    async failure(error, context = {}) {
        const duration = Date.now() - this.startTime;
        return await recordAttempt(this.taskId, 'fail', {
            ...this.context,
            ...context,
            duration,
            error: error.message || error.toString()
        });
    }
}

export default {
    recordAttempt,
    getAttemptHistory,
    clearAttemptHistory,
    getFailedTasks,
    HiOSTaskTracker
};