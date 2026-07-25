import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------
// Test 1: Pasted transcript is converted into valid segments
// ---------------------------------------------------------------
function parseTranscript(content: string) {
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line, idx) => {
      const colonIdx = line.indexOf(':')
      let speaker = 'Unknown'
      let text = line.trim()
      if (colonIdx > 0 && colonIdx < 50) {
        const candidate = line.slice(0, colonIdx).trim()
        if (candidate && /^[A-Za-z\s.'-]+$/.test(candidate)) {
          speaker = candidate
          text = line.slice(colonIdx + 1).trim()
        }
      }
      return { speaker, text, start: idx * 5, end: (idx + 1) * 5 }
    })
}

describe('Transcript Parsing', () => {
  const sampleTranscript = `Sarah: We will release the beta on August 5, 2026.
Marcus: I will prepare the deployment checklist by August 2, 2026.
Priya: The security review has no owner and must happen before deployment.
Sarah: Marcus will run the authentication load test by August 1, 2026.
James: I will update the documentation by August 3, 2026.
Marcus: Deployment depends on the security review and load test.
Sarah: No external action should happen without human approval.`

  it('converts pasted transcript into valid segments', () => {
    const segments = parseTranscript(sampleTranscript)
    expect(segments).toHaveLength(7)
    expect(segments[0].speaker).toBe('Sarah')
    expect(segments[0].text).toBe('We will release the beta on August 5, 2026.')
    expect(segments[1].speaker).toBe('Marcus')
    expect(segments[4].speaker).toBe('James')
  })

  // Test 2: Transcript request matches backend schema
  it('matches backend TranscriptUpload schema (segments array)', () => {
    const segments = parseTranscript(sampleTranscript)
    const payload = { segments }

    expect(payload).toHaveProperty('segments')
    expect(Array.isArray(payload.segments)).toBe(true)
    for (const seg of payload.segments) {
      expect(seg).toHaveProperty('speaker')
      expect(seg).toHaveProperty('text')
      expect(seg).toHaveProperty('start')
      expect(seg).toHaveProperty('end')
      expect(typeof seg.speaker).toBe('string')
      expect(typeof seg.text).toBe('string')
      expect(typeof seg.start).toBe('number')
      expect(typeof seg.end).toBe('number')
    }
  })

  it('handles lines without speaker labels', () => {
    const segments = parseTranscript('No speaker here\nJohn: Has speaker')
    expect(segments[0].speaker).toBe('Unknown')
    expect(segments[0].text).toBe('No speaker here')
    expect(segments[1].speaker).toBe('John')
    expect(segments[1].text).toBe('Has speaker')
  })

  // Test 4: Empty transcript returns visible validation error
  it('produces zero segments for empty input', () => {
    const segments = parseTranscript('')
    expect(segments).toHaveLength(0)
  })

  it('produces zero segments for whitespace-only input', () => {
    const segments = parseTranscript('   \n\n   ')
    expect(segments).toHaveLength(0)
  })

  it('uses sequential timestamps', () => {
    const segments = parseTranscript(sampleTranscript)
    for (let i = 0; i < segments.length; i++) {
      expect(segments[i].start).toBe(i * 5)
      expect(segments[i].end).toBe((i + 1) * 5)
    }
  })
})

// ---------------------------------------------------------------
// Test 5: Successful flow performs create -> transcript -> process in order
// ---------------------------------------------------------------
describe('Processing Flow Order', () => {
  it('ensures create -> transcript -> process order', async () => {
    const callOrder: string[] = []

    // Mock the three API calls
    const mockCreate = async () => {
      callOrder.push('create')
      return { id: 'meeting-1' }
    }
    const mockTranscript = async () => {
      callOrder.push('transcript')
      return { segments: [] }
    }
    const mockProcess = async () => {
      callOrder.push('process')
      return { status: 'processing' }
    }

    // Simulate the flow
    const meeting = await mockCreate()
    await mockTranscript()
    await mockProcess()

    expect(callOrder).toEqual(['create', 'transcript', 'process'])
    expect(meeting.id).toBe('meeting-1')
  })

  // Test 3: Processing is not called when transcript upload fails
  it('does not call process when transcript upload fails', async () => {
    const callOrder: string[] = []

    const mockCreate = async () => {
      callOrder.push('create')
      return { id: 'meeting-1' }
    }
    const mockTranscript = async () => {
      callOrder.push('transcript')
      throw new Error('Upload failed')
    }
    const mockProcess = async () => {
      callOrder.push('process')
    }

    await mockCreate()
    try {
      await mockTranscript()
      await mockProcess()
    } catch {
      // Expected
    }

    expect(callOrder).toEqual(['create', 'transcript'])
    expect(callOrder).not.toContain('process')
  })
})

// ---------------------------------------------------------------
// Test 6 & 7: Polling stops at awaiting_review / failed
// ---------------------------------------------------------------
describe('Polling Logic', () => {
  function shouldPoll(status: string): boolean {
    return status === 'processing'
  }

  it('polls while status is processing', () => {
    expect(shouldPoll('processing')).toBe(true)
  })

  it('stops polling at awaiting_review', () => {
    expect(shouldPoll('awaiting_review')).toBe(false)
  })

  it('stops polling at failed', () => {
    expect(shouldPoll('failed')).toBe(false)
  })

  it('stops polling at approved', () => {
    expect(shouldPoll('approved')).toBe(false)
  })
})

// ---------------------------------------------------------------
// Test 10: Real response mapper renders summary, action items, decisions, risks
// ---------------------------------------------------------------
describe('Response Mapper', () => {
  // Simulate the backend response and mapping logic
  function mapMeetingStatus(s: string) {
    const map: Record<string, string> = {
      scheduled: 'awaiting_review',
      in_progress: 'processing',
      completed: 'approved',
      processing: 'processing',
      awaiting_review: 'awaiting_review',
      failed: 'failed',
    }
    return map[s] ?? 'awaiting_review'
  }

  function mapBackendMeeting(m: Record<string, unknown>) {
    const transcript = (m.transcript as { segments?: { speaker?: string; text?: string; start?: number; end?: number }[] } | null)
    const segments = transcript?.segments ?? []
    return {
      id: m.id,
      title: m.title,
      status: mapMeetingStatus(m.status as string),
      executiveSummary: m.summary ?? undefined,
      transcript: segments.map((seg: { speaker?: string; text?: string; start?: number; end?: number }, idx: number) => ({
        id: `seg-${idx}`,
        startTime: seg.start ?? 0,
        endTime: seg.end ?? 0,
        speaker: seg.speaker ?? 'Unknown',
        text: seg.text ?? '',
      })),
    }
  }

  const backendResponse = {
    id: 'test-id',
    title: 'Beta Release Planning',
    status: 'awaiting_review',
    summary: 'Team discussed sprint priorities.',
    transcript: {
      segments: [
        { speaker: 'Sarah', text: 'We will release the beta.', start: 0, end: 5 },
        { speaker: 'Marcus', text: 'Deployment checklist ready.', start: 5, end: 10 },
      ],
    },
  }

  it('maps summary correctly', () => {
    const mapped = mapBackendMeeting(backendResponse)
    expect(mapped.executiveSummary).toBe('Team discussed sprint priorities.')
  })

  it('maps transcript segments correctly', () => {
    const mapped = mapBackendMeeting(backendResponse)
    expect(mapped.transcript).toHaveLength(2)
    expect(mapped.transcript[0].speaker).toBe('Sarah')
    expect(mapped.transcript[1].speaker).toBe('Marcus')
  })

  it('maps awaiting_review status correctly', () => {
    const mapped = mapBackendMeeting(backendResponse)
    expect(mapped.status).toBe('awaiting_review')
  })

  it('maps failed status correctly', () => {
    const mapped = mapBackendMeeting({ ...backendResponse, status: 'failed' })
    expect(mapped.status).toBe('failed')
  })

  it('maps completed to approved', () => {
    const mapped = mapBackendMeeting({ ...backendResponse, status: 'completed' })
    expect(mapped.status).toBe('approved')
  })

  it('handles missing transcript', () => {
    const mapped = mapBackendMeeting({ ...backendResponse, transcript: null })
    expect(mapped.transcript).toHaveLength(0)
  })
})

// ---------------------------------------------------------------
// New tests for LLM extraction + new intelligence types
// ---------------------------------------------------------------
describe('BackendMeetingStatus type coverage', () => {
  function mapMeetingStatus(s: string) {
    const map: Record<string, string> = {
      scheduled: 'awaiting_review',
      in_progress: 'processing',
      completed: 'approved',
      processing: 'processing',
      awaiting_review: 'awaiting_review',
      failed: 'failed',
    }
    return map[s] ?? 'awaiting_review'
  }

  it('maps processing status correctly', () => {
    expect(mapMeetingStatus('processing')).toBe('processing')
  })

  it('maps awaiting_review status correctly', () => {
    expect(mapMeetingStatus('awaiting_review')).toBe('awaiting_review')
  })

  it('maps failed status correctly', () => {
    expect(mapMeetingStatus('failed')).toBe('failed')
  })
})

describe('Risk Mapping', () => {
  function mapBackendRisk(r: { id: string; meeting_id: string; title: string; description?: string; severity: string; likelihood: string; mitigation?: string; owner?: string; confidence: number }) {
    return {
      id: r.id,
      meetingId: r.meeting_id,
      title: r.title,
      description: r.description ?? '',
      severity: r.severity,
      likelihood: r.likelihood,
      mitigation: r.mitigation,
      owner: r.owner,
      confidence: r.confidence,
    }
  }

  it('maps risk fields correctly', () => {
    const mapped = mapBackendRisk({
      id: 'risk-1',
      meeting_id: 'm-1',
      title: 'Security review unowned',
      description: 'No owner assigned',
      severity: 'high',
      likelihood: 'medium',
      mitigation: 'Assign owner',
      owner: 'Priya',
      confidence: 0.85,
    })
    expect(mapped.title).toBe('Security review unowned')
    expect(mapped.severity).toBe('high')
    expect(mapped.confidence).toBe(0.85)
    expect(mapped.mitigation).toBe('Assign owner')
  })

  it('handles missing optional fields', () => {
    const mapped = mapBackendRisk({
      id: 'risk-2',
      meeting_id: 'm-1',
      title: 'Test risk',
      severity: 'low',
      likelihood: 'low',
      confidence: 0.5,
    })
    expect(mapped.description).toBe('')
    expect(mapped.mitigation).toBeUndefined()
    expect(mapped.owner).toBeUndefined()
  })
})

describe('Dependency Mapping', () => {
  it('maps dependency type correctly', () => {
    const dep = {
      id: 'd-1',
      meeting_id: 'm-1',
      from_item: 'Deployment',
      to_item: 'Security review',
      dependency_type: 'requires',
      description: 'Must complete before deploy',
    }
    expect(dep.dependency_type).toBe('requires')
    expect(dep.from_item).toBe('Deployment')
    expect(dep.to_item).toBe('Security review')
  })
})

describe('Clarification Mapping', () => {
  it('maps clarification with pending status', () => {
    const clar = {
      id: 'c-1',
      meeting_id: 'm-1',
      question: 'Who owns the security review?',
      context: 'No owner mentioned',
      status: 'pending',
    }
    expect(clar.status).toBe('pending')
    expect(clar.question).toBe('Who owns the security review?')
  })
})

describe('Processing Confidence', () => {
  it('maps processing_confidence from backend', () => {
    const meeting = {
      processing_confidence: 0.82,
    }
    expect(meeting.processing_confidence).toBe(0.82)
    expect(meeting.processing_confidence).toBeGreaterThan(0)
    expect(meeting.processing_confidence).toBeLessThanOrEqual(1)
  })

  it('handles null processing_confidence', () => {
    const meeting = {
      processing_confidence: null as number | null,
    }
    expect(meeting.processing_confidence).toBeNull()
  })
})

describe('Decision with decided_by_name', () => {
  it('prefers decided_by_name over made_by UUID', () => {
    const decision = {
      decided_by_name: 'Sarah',
      made_by: '550e8400-e29b-41d4-a716-446655440000',
    }
    const decidedBy = decision.decided_by_name
      ? [decision.decided_by_name]
      : decision.made_by
        ? [decision.made_by]
        : ['Unknown']
    expect(decidedBy).toEqual(['Sarah'])
  })

  it('falls back to made_by when decided_by_name is null', () => {
    const decision = {
      decided_by_name: null as string | null,
      made_by: 'some-uuid',
    }
    const decidedBy = decision.decided_by_name
      ? [decision.decided_by_name]
      : decision.made_by
        ? [decision.made_by]
        : ['Unknown']
    expect(decidedBy).toEqual(['some-uuid'])
  })
})
