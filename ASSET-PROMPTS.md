# 이미지 제작 기록

도구: 내장 ImageGen. API/CLI는 사용하지 않았습니다.

- `assets/start-screen.png`: 사용자가 제공한 데이터 런 시작 화면 원본.
- `assets/school-world.png`: 새로 생성한 3:1 학교 배경.
- `assets/robot-run.png`: 제공된 로봇을 바탕으로 생성한 투명 배경 4프레임 달리기 스프라이트.

## 학교 배경 프롬프트

Use case: stylized-concept. Asset type: seamless horizontal scrolling background for a children's school runner web game. Use attached school game start screen only as a STYLE reference: same sunny cheerful glossy 3D animated toy world, mint, lavender, gold, blue sky. Create a NEW wide 3:1 panoramic school campus cutaway, containing adjacent cafeteria with colorful food counters, classroom with desks and green chalkboard, cozy library bookshelves, clean sinks area, and school garden trees. One single level at the same floor height across entire panorama, front / slight 3-quarter view, broad empty golden running walkway spanning bottom 25%, rooms and trees in upper 75%. The left and right edges should both have greenery and sky for natural scrolling loop. High quality rounded architecture, vibrant but softly lit. NO characters, NO text, NO titles, NO buttons, NO UI, NO coins. Detailed background only. Keep the front walkway unobstructed for animated character overlay.

## 달리기 캐릭터 프롬프트

Use case: identity-preserve. Asset type: 4 frame running sprite sheet for a web game. Reference image shows SAME mascot in multiple poses. Recreate exactly this adorable mint-green and lavender pearlescent robot: black glossy rounded screen face, huge sparkly eyes, lavender smiling mouth, purple ball antenna, ear discs, little chart and pie-chart on torso, rounded short arms and feet. Make a SINGLE horizontal strip of FOUR equally sized square cells (4:1 aspect). Each contains full body of this SAME robot, three-quarter view facing and moving to the RIGHT, four consecutive frames of an energetic running loop: left leg forward, passing pose, right leg forward, passing pose. Alternate arms and legs clearly, keep head and torso scale consistent. Every robot entirely inside its cell with 10% margin, feet same baseline. Preserve the exact character identity from reference, not a redesigned mascot. Real transparent background, NO white cards, NO panels, NO text, NO grid, NO floor, NO shadows outside the character. Glossy 3D animation style matching reference.

출력은 2172×724의 가로 스트립이며, 동일한 너비의 네 프레임으로 표시합니다.
