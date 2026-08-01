type QuizOptionWithAnswerKey = {
    isCorrect?: boolean;
};

type QuizWithAnswerKeys = {
    questions?: Array<{
        options?: QuizOptionWithAnswerKey[];
    }>;
};

const RESTRICTED_QUIZ_VIEWER_ROLES = new Set(['LEARNER', 'PARENT']);

export function isRestrictedQuizViewer(role: string) {
    return RESTRICTED_QUIZ_VIEWER_ROLES.has(role);
}

export function normalizeQuizViewerGrades(grades: Array<string | null | undefined>) {
    return [...new Set(grades.filter((grade): grade is string => Boolean(grade)))];
}

export function canRestrictedViewerAccessQuiz(params: {
    role: string;
    isPublished: boolean;
    subjectGrade: string | null | undefined;
    viewerGrades: string[];
}) {
    if (!isRestrictedQuizViewer(params.role)) return true;
    return Boolean(
        params.isPublished &&
        params.subjectGrade &&
        params.viewerGrades.includes(params.subjectGrade),
    );
}

export function stripQuizAnswerKeys<T extends QuizWithAnswerKeys>(quiz: T) {
    quiz.questions?.forEach((question) => {
        question.options?.forEach((option) => {
            delete option.isCorrect;
        });
    });
    return quiz;
}
