export const categories = [
  "버려야 할 것",
  "다른 사람의 도움을 받아야 할 것",
  "지금 바로 해결해야 할 것",
  "천천히 해결해도 되는 것",
];
export const tutorial = [
  {
    story: "찢어진 내 메모 종이예요. 적힌 내용도 더는 필요 없어요.",
    answer: 0,
    explanation: "다시 쓰기 어렵고 내용도 필요 없으니 버릴 것으로 나눠요.",
  },
  {
    story: "이 상자는 혼자 들기 어려워요. 어른과 함께 옮겨야 해요.",
    answer: 1,
    explanation: "혼자 옮기기 어려운 상자는 도움을 받아 옮겨요.",
  },
  {
    story: "다음 수업이 곧 시작돼요. 수업에 쓸 공책을 꺼내야 해요.",
    answer: 2,
    explanation: "곧 쓸 공책이니 지금 꺼내 두어요.",
  },
  {
    story: "이번 주말에 정리하기로 한 사진이에요. 오늘 쓸 사진은 없어요.",
    answer: 3,
    explanation: "오늘 필요하지 않고 정리할 때를 정했으니 나중에 해도 돼요.",
  },
];
export const quiz = [
  {
    title: "정리 정돈과 청소",
    question:
      "책을 제자리에 놓는 일과 책상의 먼지를 닦는 일을 바르게 짝지은 것은 무엇인가요?",
    options: [
      "책을 제자리에 놓기: 정리 정돈 / 먼지 닦기: 청소",
      "책을 제자리에 놓기: 청소 / 먼지 닦기: 정리 정돈",
      "두 일 모두 정리 정돈",
    ],
    answer: 0,
    explanation:
      "책을 제자리에 놓는 것은 정리 정돈이고, 먼지를 닦는 것은 청소예요.",
  },
  {
    title: "실제 청소를 시작할 때",
    question: "실제 생활에서 청소를 시작할 때 가장 먼저 할 일은 무엇인가요?",
    options: [
      "바닥을 쓸고 닦기",
      "사용한 청소 도구를 정리하기",
      "옷차림과 청소 도구를 준비하고 창문을 열어 환기하기",
    ],
    answer: 2,
    explanation:
      "준비와 환기를 먼저 해요. 그다음 물건을 정리하고 먼지를 닦아요. 바닥을 청소한 뒤에는 도구를 정리해요.",
  },
  {
    title: "자주 쓰는 물건",
    question: "자주 사용하는 물건은 어디에 보관하면 좋을까요?",
    options: [
      "다른 물건 뒤에 가려진 곳",
      "손이 잘 닿아 꺼내기 쉬운 곳",
      "찾을 때마다 다른 곳",
    ],
    answer: 1,
    explanation: "자주 쓰는 물건은 손이 잘 닿는 곳에 두면 꺼내기 쉬워요.",
  },
];
export const characters = [
  { id: "rabbit", label: "토끼" },
  { id: "bear", label: "곰" },
  { id: "cat", label: "고양이" },
  { id: "bird", label: "새" },
];
export const tools = [
  { id: "duster", label: "손걸레" },
  { id: "broom", label: "빗자루" },
  { id: "cloth", label: "바닥걸레" },
] as const;
