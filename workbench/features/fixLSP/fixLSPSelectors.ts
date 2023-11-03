import { FixLSPState, FullState } from 'vs/workbench/features/window/state'
import { createSelector } from 'vs/workbench/libraries/reselect'

export const selectFixesByFileId = (fileId: number) =>
    createSelector(
        (state: FullState) => state.fixLSPState.fixes,
        (fixes: FixLSPState['fixes']) => fixes[fileId]
    )
