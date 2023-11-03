import { FullState } from 'vs/workbench/features/window/state'

export const getFeedbackMessage = (state: FullState) =>
    state.loggingState.feedbackMessage
export const getIsOpen = (state: FullState) => state.loggingState.isOpen
