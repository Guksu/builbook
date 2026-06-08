# 08 — 온디바이스 AI 문답 구현 노트

## 결정 요약
- **아키텍처:** C(하이브리드) — 브라우저 Transformers.js + Web Worker, 토큰은 postMessage 스트리밍. **SSE 아님**(백엔드/네트워크 구간 없음). assignment(회사 코드)는 엣지케이스·이벤트 계약 *개념*만 차용, 구조 미복제.
- **모델:** `onnx-community/Qwen3-0.6B-ONNX`, dtype `q4` 고정(q4f16 금지), thinking 비활성(enable_thinking=false), device 런타임 결정(WebGPU→WASM 폴백). q4 919MB — 천장 미지수 구간이라 OOM 시 Qwen2.5-0.5B 롤백 준비. ※ 상세·근거는 하단 "2026-06-09 Qwen3-0.6B 적용" 참조.
- **배치:** 작업실 우측 패널, 인스펙터처럼 토글(`AI 문답` 버튼).
- **게이팅:** "기능 사용" 클릭 시에만 모델 다운로드/로드.

## 메시지 계약 (SSOT: `src/shared/ai/messages.ts`)
- 메인→worker: `load` / `generate{id,messages}` / `abort`
- worker→메인: `progress{loaded,total,percent}` / `ready` / `token{id,delta}` / `done{id,text}` / `error{message,id?}` / `aborted{id}`
- worker.ts와 engine.ts가 **둘 다 import**(리터럴 중복 금지). QA에서 1:1 일치 확인.

## 상태 머신 (`useAiChat`)
`idle → downloading → ready → generating → ready`, 어디서든 `error`(로드 실패만). 생성 중 에러는 부분 텍스트 보존 후 `ready` 복귀.

## 엣지케이스 처리
| 케이스 | 처리 |
|--------|------|
| 중복 다운로드 | 메인 `enable()` downloading 가드 + worker `generator`/`loadingPromise` 재진입 가드 |
| 취소 잔여 토큰 | `activeIdRef` 불일치 토큰 드롭 + `stop()` 낙관적 종료 |
| 빈 응답 | `finalize`에서 빈 content 메시지 미생성 |
| 생성 중 에러 | 부분 텍스트 보존 + 에러 표시 + 입력 재활성화 |
| WebGPU 미지원 | worker `detectDevice()` WASM 폴백 |
| 패널 토글 시 모델 유실 | `useAiChat`를 view 레벨에 둬 위젯만 언/마운트 |
| 자동 스크롤 | 하단 추종, 사용자 위로 스크롤 시 해제 |
| 컨텍스트 폭주 | 최근 `MAX_HISTORY_TURNS`(8)턴만 + system |

## 파일
- `src/shared/ai/{messages,models,worker,engine,index}.ts`
- `src/features/ai-chat/{model/types.ts,model/useAiChat.ts,index.ts}`
- `src/widgets/ai-assistant/{ui/AiAssistant.tsx,index.ts}`
- `src/views/workspace/ui/WorkspacePage.tsx`(통합)
- `package.json`(+`@huggingface/transformers` v4.2.0)

## 검증
- `npx tsc --noEmit` → 0건. `npm run build` → 성공(워커/transformers 별도 청크, 첫 로드 JS 비대화 없음).
- qa-inspector 경계면 교차검증 → 6/6 PASS, FAIL 0.

## 런타임 미검증(범위 밖) / 후속 확인 권장
- 실제 모델 다운로드·추론·한국어 응답 품질(브라우저에서 `npm run dev` 후 "기능 사용" 클릭하여 확인).
- `.onnx/.wasm` 자산 로딩은 기본 설정으로 빌드 통과 — dev 런타임에서 최종 확인 권장. 문제 시 `client-ai-inference/references/edge-cases.md` §7 참조.

---

## 2026-06-09 — 모델 디버깅·확정 (부분 재실행)

### 디버깅 이력 (실측, 이 기기)
| 모델 | dtype | 결과 |
|------|-------|------|
| onnx-community/Llama-3.2-1B-Instruct | q4 (~800MB) | 로드·코히런트 OK, **한국어 약함** → 교체 |
| onnx-community/EXAONE-3.5-2.4B-Instruct | q4 | **OOM** (std::bad_alloc) |
| onnx-community/Qwen2.5-1.5B-Instruct | q4f16 (WebGPU) | 로드되나 **gibberish** (어댑터 fp16 불안정) |
| onnx-community/Qwen2.5-1.5B-Instruct | q4 (~1.1GB) | **OOM** (std::bad_alloc) |
| **onnx-community/Qwen2.5-0.5B-Instruct** | **q4** | **채택** — 천장 내 최대 검증 모델 |

### 기기 제약 (확정 사실)
- WebGPU 사용 가능('WebGPU OK' 콘솔 확인), 단 내장 GPU 추정 — **VRAM/버퍼 천장 ~0.8GB**. 그 이상 모델은 OOM.
- **q4f16 금지.** 이 어댑터에서 fp16 혼합 양자화는 수치 불안정 → gibberish. q4(비-f16)만 안정.

### 최종 결정: `onnx-community/Qwen2.5-0.5B-Instruct`, dtype `q4`
근거(코드/설정 정합성까지 검증 완료):
- HF 트리 확인: `onnx/model_q4.onnx` **존재, 실측 ≈ 786MB** (q4f16은 483MB지만 **금지**).
- `config.json` arch = **Qwen2ForCausalLM** (model_type=qwen2) → transformers.js v4.2.0 **정식 지원 아키텍처**.
- `tokenizer_config.json`에 **chat_template 포함**(len 2507) → 메시지 배열을 파이프라인에 넘기면 ChatML 자동 적용(worker가 `ChatTurn[]` 전달 → 정상 경로).
- 786MB는 사용자 천장(~0.8GB)에 근접하지만 **이미 로드 성공 확인됨**.

### 한국어 특화 소형 모델 조사 (HyperCLOVAX SEED 0.5B)
- HF API 전수 조사 결과 HyperCLOVAX-SEED-0.5B의 **ONNX 가중치는 어디에도 없음**(GGUF/MLX/CoreML/safetensors만 존재, onnx-community 미보유).
- 네이티브 아키텍처 `HyperCLOVAXForCausalLM`은 transformers.js 미지원(커뮤니티 `minpeter/...-hf` Llamafied 변환본조차 ONNX 없음).
- → 현 시점 **transformers.js로 사용 불가**. 추측 다운로드로 깨뜨리지 않고 검증된 Qwen2.5-0.5B 유지.

### 생성 파라미터 변경 (소형 모델 산만/반복 억제)
- `temperature` 0.7 → **0.6** (0.5B는 고온에서 이탈 쉬움).
- `repetition_penalty` **1.15 신규 추가** (소형 모델 구절 반복 루프 억제). worker generate 호출에 `repetition_penalty: GEN.repetitionPenalty` 반영.
- `topP` 0.9, `maxNewTokens` 512 유지. `MODEL_DTYPE="q4"` 단일 상수 유지(q4f16 분기 없음).

### 변경 파일
- `src/shared/ai/models.ts`: MODEL_APPROX_MB 500→**790**(q4 실측 반영), 이력 주석 갱신, q4f16 금지 명시, GEN.temperature 0.6 + GEN.repetitionPenalty 1.15 추가.
- `src/shared/ai/worker.ts`: generate 호출에 `repetition_penalty: GEN.repetitionPenalty` 추가.
- `AiAssistant.tsx`: 변경 없음 — MODEL_LABEL/MODEL_APPROX_MB 자동 소비, MB/GB 분기(>=1000)로 "약 790MB" 표기 정상.

### 검증 한계 (중요)
- 본 작업은 **코드/설정 정합성만** 보장: 모델 ID 유효, q4 파일 존재, dtype, chat_template 적용 경로, 별칭 import, `npx tsc --noEmit` 0건.
- **실제 코히런스·한국어 품질은 브라우저 인-브라우저 테스트 필요**(에이전트는 브라우저 추론 불가).

### 인-브라우저 재시도 절차
1. 이전 모델/깨진 q4f16 캐시 제거: DevTools → Application → Cache Storage의 `transformers-cache` 삭제(또는 Clear site data).
2. **하드 리프레시**(Cmd+Shift+R).
3. AI 문답 패널 → "기능 사용" → 진행률 100% 후 한국어 질문 테스트.

### 후속 폴백 옵션 (0.5B 한국어가 불만족스러울 때)
- 이 기기 메모리 천장(~0.8GB) 때문에 **더 큰(1.5B+) 한국어 우수 모델은 OOM** → 온디바이스로는 한계.
- 현실적 대안은 **클라우드 LLM 도입**(서버 라우트 + SSE)뿐. 단 builbook local-first 원칙(백엔드 없음)과 충돌하므로 제품 결정 필요.
- 또는 HyperCLOVAX-SEED-0.5B의 **ONNX(q4) 변환본이 향후 공개되면** 재평가(Qwen2와 유사 메모리 + 한국어 특화 기대).

---

## 2026-06-09 — "더 똑똑하고 한국어 특화" 업그레이드 조사 (후속, 실측)

### 동기
사용자가 Qwen2.5-0.5B(q4 786MB)보다 더 똑똑/한국어 나은 모델을 원함. 제약 동일: 천장 ~0.8GB(q4), q4f16 금지, transformers.js v4.2.0 arch 지원, q4 ONNX 실재 필수.

### transformers.js v4.2.0 arch 지원 확인 (설치 패키지 registry.js 직접 확인 — 추측 아님)
`node_modules/@huggingface/transformers/src/models/registry.js`의 CausalLM 매핑에 다음 등록 확인:
`['qwen3','Qwen3ForCausalLM']`, `['gemma3','Gemma3ForCausalLM']`, `['exaone','ExaoneForCausalLM']`, `['granite','GraniteForCausalLM']`.
→ Qwen3/Gemma3/EXAONE arch 자체는 v4.2.0에서 지원됨(arch는 탈락 사유 아님). 탈락은 전부 **용량 또는 ONNX 부재** 때문.

### 후보별 실측 표 (HF API tree, 바이트→MB)
| 모델 | q4 ONNX | q4 용량 | ≤0.8GB 천장 | arch v4.2.0 | chat_template | 판정 |
|------|---------|---------|:-----------:|-------------|:-------------:|------|
| **Qwen2.5-0.5B-Instruct (현행)** | 있음 | **786MB** | ✅(로드 확인) | qwen2 ✅ | ✅ | **유지(상한)** |
| onnx-community/Qwen3-0.6B-ONNX | 있음 | **919MB**(단일) | ❌ 초과 | qwen3 ✅ | ✅ | **제외 — 천장 초과(OOM 위험)** |
| onnx-community/gemma-3-1b-it-ONNX | 있음(분할) | **859MB**(.onnx_data) | ❌ 초과 | gemma3 ✅ | ✅ | **제외 — 천장 초과** |
| EXAONE 소형(<2.4B) | 없음 | — | — | exaone ✅ | — | 제외 — q4 ONNX 부재(2.4B만 있고 이미 OOM) |
| Kakao Kanana-nano | 없음 | — | — | — | — | 제외 — ONNX 전무(GGUF/safetensors만) |
| HyperCLOVAX-SEED 0.5B/1.5B | 없음 | — | — | n/a | — | 제외 — ONNX 전무(재확인, 변동 없음) |

근거 디테일:
- Qwen3-0.6B `model_q4.onnx` = 919,096,585 B ≈ **919MB**. 786MB(확인 로드)보다 +133MB, 명시 천장 ~0.8GB 초과 → OOM 위험. q4f16(570MB)은 **금지**라 우회 불가. int8(618MB)은 q4 아님 + 사용자 제약(q4 고정) 밖.
- gemma-3-1b-it는 q4도 외부 데이터 분할(`model_q4.onnx_data` 859,106,816 B ≈ **859MB**) → 천장 초과. bnb4/int8은 더 큼.
- EXAONE는 onnx-community에 2.4B만 존재(이미 OOM 실측). 1.2B 등 소형 ONNX 없음.
- Kanana·HyperCLOVAX는 ONNX 자체 부재(GGUF/MLX/CoreML/safetensors만).

### 결정: **업그레이드 없음 — Qwen2.5-0.5B-Instruct(q4 786MB) 유지.**
이 기기 제약(천장 ~0.8GB + q4f16 금지)에서 "더 똑똑/한국어 나은" 모델은 전부 (a) 천장 초과(Qwen3-0.6B, gemma-3-1b) 또는 (b) q4 ONNX 부재(EXAONE 소형·Kanana·HyperCLOVAX)로 탈락. **현 모델이 이 기기 온디바이스 상한.** 코드 변경 없음(MODEL_ID/dtype/GEN 그대로). `npx tsc --noEmit` 0건 재확인.

### 상한을 올리려면 (제품 결정 필요)
- 천장이 ~1GB로만 올라가도 **Qwen3-0.6B(919MB)** 가 곧장 1순위(세대 업 + 한국어 향상, arch·템플릿 검증 완료). 더 강한 GPU/다른 기기에서는 즉시 채택 가능 — 후보로 대기.
- 더 똑똑한 한국어를 확실히 원하면 결국 **클라우드 LLM(서버+SSE)** 이 유일한 현실 경로(단 local-first 원칙과 충돌, 제품 결정 사안).
- HyperCLOVAX/Kanana의 q4 ONNX가 공개되면 재평가.

---

## 2026-06-09 — Qwen3-0.6B 적용 (사용자 결정)

### 모델
- **MODEL_ID = `onnx-community/Qwen3-0.6B-ONNX`**, dtype **q4** (q4f16 금지 불변), MODEL_LABEL="Qwen3 0.6B", MODEL_APPROX_MB=**919**(model_q4.onnx 실측 919,096,585 B).
- arch=`Qwen3ForCausalLM`(model_type qwen3) — 설치된 transformers.js v4.2.0 `registry.js` CausalLM 매핑 `['qwen3','Qwen3ForCausalLM']` 등록 확인. chat_template 포함(enable_thinking 분기 보유).
- **용량 주의:** 919MB는 786MB(확인 로드)와 1.1GB(OOM) 사이 미지수 구간. 로드 실패(OOM) 가능성 있음 → 아래 롤백 절차 준비.

### Qwen3 thinking 비활성 처리 (핵심)
- **방법: 파이프라인 `tokenizer_encode_kwargs.enable_thinking=false` 전달** (택한 이유: 가장 깔끔 + 동작 보장).
- 근거(실측): `node_modules/@huggingface/transformers/src/pipelines/text-generation.js` L143–147에서 파이프라인이
  `chat_template_kwargs = { tokenize:false, add_generation_prompt:true, ...tokenizer_kwargs }`를 만들어
  `tokenizer.apply_chat_template(x, chat_template_kwargs)`에 넘긴다. `tokenizer_kwargs`는 generate 옵션의
  `tokenizer_encode_kwargs`에서 온다(L111). 즉 `generator(msgs, { tokenizer_encode_kwargs:{enable_thinking:false} })`가
  그대로 apply_chat_template로 전달됨 → **수동 템플릿 호출 불필요, 메시지 계약 불변.**
- Qwen3 chat_template(실측)은 `{%- if enable_thinking is defined and enable_thinking is false %}{{- '<think>\n\n</think>\n\n' }}{%- endif %}`로
  enable_thinking=false면 빈 think 블록을 프롬프트에 주입 → 모델이 추론을 건너뛰고 바로 답한다.
- **적용 위치:**
  - `src/shared/ai/models.ts`: `export const ENABLE_THINKING = false;` (+근거 주석).
  - `src/shared/ai/worker.ts`: import에 `ENABLE_THINKING` 추가 / generate 호출에 `tokenizer_encode_kwargs: { enable_thinking: ENABLE_THINKING }` (worker.ts L≈137).
- 검토하고 버린 대안: (i) pipeline이 안 넘기면 불가 → 넘김 확인되어 채택. (ii) `/no_think` 소프트 스위치를 SYSTEM_PROMPT에 부착 — 동작하나 공식 kwarg 경로가 더 깔끔해 미채택. (iii) worker에서 apply_chat_template 직접 호출 후 문자열 전달 — 메시지/스트리머 경로 복잡도↑라 미채택.
- **Fallback 메모(이번 범위 밖):** 만약 그래도 `<think>...</think>`가 출력에 새면, 토큰 스트림에서 `</think>` 이전을 숨기는 파싱을 worker나 useAiChat에 추가하는 것이 다음 단계. 우선은 enable_thinking=false로 해결됨을 가정.

### GEN 파라미터 (Qwen3 비-thinking 공식 권장)
- temperature **0.7**, top_p **0.8**, **top_k 20**(신규), repetition_penalty **1.1**(소형 반복 억제, 1.15에서 완화), max_new_tokens 512, do_sample true.
- worker generate 호출에 `top_k: GEN.topK` 추가(messages 계약 불변 — generate 옵션만 확장).
- (thinking 모드 권장은 temp0.6/top_p0.95지만 우리는 비-thinking이므로 0.7/0.8/20 적용.)

### 변경 파일
- `src/shared/ai/models.ts`: MODEL_ID/LABEL/APPROX_MB(919), 이력 주석, `ENABLE_THINKING=false` 신규, GEN(temp0.7/top_p0.8/top_k20/rep1.1).
- `src/shared/ai/worker.ts`: `ENABLE_THINKING` import, generate에 `top_k` + `tokenizer_encode_kwargs:{enable_thinking}` 추가.
- `AiAssistant.tsx`: 변경 없음 — APPROX_MB 919는 MB 분기(<1000)로 "약 919MB" 정상 표기.
- `npx tsc --noEmit` → **0건**.

### OOM 시 롤백 (한 줄 요약)
**OOM(std::bad_alloc) 발생 시:** `models.ts`에서 MODEL_ID를 `onnx-community/Qwen2.5-0.5B-Instruct`, MODEL_LABEL="Qwen2.5 0.5B Instruct", MODEL_APPROX_MB=790으로 되돌리고, **thinking 관련 변경 원복**(ENABLE_THINKING 제거 + worker의 `top_k`/`tokenizer_encode_kwargs` 라인 제거, GEN을 temp0.6/top_p0.9/rep1.15로 환원). Qwen2.5는 thinking 모드가 없어 enable_thinking kwarg 불필요.

### 인-브라우저 재시도 절차
1. DevTools → Application → Cache Storage `transformers-cache` 삭제(이전 Qwen2.5 캐시 제거 — 새 모델 받기 위함).
2. **하드 리프레시**(Cmd+Shift+R).
3. AI 문답 → "기능 사용" → 약 919MB 다운로드 → 한국어 질문. 응답 앞에 `<think>`가 안 보이고 바로 답하면 thinking 비활성 성공.
4. 로드가 std::bad_alloc로 실패하면 위 "OOM 시 롤백" 적용.
