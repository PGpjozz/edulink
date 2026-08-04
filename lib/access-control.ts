export function belongsToSchool(
    resourceSchoolId: string | null | undefined,
    schoolId: string | null | undefined,
): boolean {
    return Boolean(resourceSchoolId && schoolId && resourceSchoolId === schoolId);
}

export function canParentBookPtmLearner(params: {
    parentUserId: string;
    schoolId: string | null | undefined;
    ptmSessionSchoolId: string | null | undefined;
    learnerSchoolId: string | null | undefined;
    learnerParentIds: readonly string[];
}): boolean {
    return (
        belongsToSchool(params.ptmSessionSchoolId, params.schoolId) &&
        belongsToSchool(params.learnerSchoolId, params.schoolId) &&
        params.learnerParentIds.includes(params.parentUserId)
    );
}
