import {addTodolistAC, changeTodolistEntityStatusAC, removeTodolistAC, setTodolistsAC} from "../todolist-reduser";
import {TaskPriorities, TaskStatus, TaskType, todoListApi, UpdateTask} from "../../../API/todolists-api";
import {Dispatch} from "redux";
import {AppRootStateType} from "../../../App/store";
import {setAppStatusAC} from "../../../App/App-reducer";
import {handleServerAppError, handleServerNetworkError} from "../../../Utils/error-utils";
import {createAsyncThunk, createSlice, PayloadAction} from "@reduxjs/toolkit";

const InitialTasksState = {}

//----- THUNK CREATOR
export const setTasks = createAsyncThunk(
    'tasks/setTasks',
    async (todolistId: string, thunkAPI,) => {
        thunkAPI.dispatch(setAppStatusAC({status: "loading"}))
        const res = await todoListApi.getTasks(todolistId)
            try {
                const tasks = res.data.items
                thunkAPI.dispatch(setAppStatusAC({status: "succeeded"}))
                return {tasks, todolistId};
            }
            catch(error: any) {
                handleServerNetworkError(error, thunkAPI.dispatch)
                return thunkAPI.rejectWithValue(error)
            }
    })

export const removeTaskTC = createAsyncThunk(
    'tasks/removeTasks',
    async (param: { taskId: string, todoListId: string }, thunkAPI) => {
        thunkAPI.dispatch(setAppStatusAC({status: "loading"}))
        const res = await todoListApi.deleteTasks(param.taskId, param.todoListId)
             try {
                if (res.data.resultCode === 0) {
                    thunkAPI.dispatch(setAppStatusAC({status: "succeeded"}))
                    return {idTask: param.taskId, todolistId: param.todoListId}
                }
                else {
                    handleServerAppError(res.data, thunkAPI.dispatch)
                    return thunkAPI.rejectWithValue(Error)
                }
            }
            catch(Error: any) {
                handleServerNetworkError(Error, thunkAPI.dispatch)
                return thunkAPI.rejectWithValue(Error)
            }
    })


//----- SLICE CREATOR
const slice = createSlice({
    name: 'tasks',
    initialState: InitialTasksState as TasksStateType,
    reducers: {
        updateTaskAC(state, action: PayloadAction<{ id: string, model: UpdateDomainTaskModalTask, todolistId: string }>) {
            const tasks = state[action.payload.todolistId];
            const index = tasks.findIndex(t => t.id === action.payload.id);
            if (index > -1) {
                tasks[index] = {...tasks[index], ...action.payload.model}
            }
        },
        // removeTaskAC(state, action: PayloadAction<{ idTask: string, todolistId: string }>) {
        //     const tasks = state[action.payload.todolistId];
        //     const index = tasks.findIndex(t => t.id === action.payload.idTask);
        //     if (index > -1) {
        //         tasks.splice(index, 1)
        //     }
        // },
        addTaskAC(state, action: PayloadAction<{ task: TaskType, todolistId: string }>) {
            state[action.payload.todolistId].unshift(action.payload.task)
        },
        // setTasksAC(state, action: PayloadAction<{ tasks: TaskType[], todolistId: string }>) {
        //     state[action.payload.todolistId] = action.payload.tasks
        // },
    },
    extraReducers: (builder) => {
        builder.addCase(addTodolistAC, (state, action) => {
            state[action.payload.todoList.id] = [];

        });
        builder.addCase(removeTodolistAC, (state, action) => {
            delete state[action.payload.todolistId]
        });
        builder.addCase(setTodolistsAC, (state, action) => {
            action.payload.todoLists.forEach(tl => {
                state[tl.id] = []
            })
        });
        builder.addCase(setTasks.fulfilled, (state, action) => {
            state[action.payload.todolistId] = action.payload.tasks
        });
        // builder.addCase(setTasks.rejected)
        builder.addCase(removeTaskTC.fulfilled, (state, action) => {
            const tasks = state[action.payload.todolistId];
            const index = tasks.findIndex(t => t.id === action.payload.idTask);
            if (index > -1) {
                tasks.splice(index, 1)
            }
        })
    }
})

const tasksReducer = slice.reducer;


export const {updateTaskAC, addTaskAC} = slice.actions;



export const addTaskTC = (todolistId: string, title: string) => (
    dispatch: Dispatch) => {
    dispatch(changeTodolistEntityStatusAC({id: todolistId, entityStatus: 'loading'}))
    dispatch(setAppStatusAC({status: 'loading'}))
    todoListApi.createTask(todolistId, title)
        .then(res => {
            if (res.data.resultCode === 0) {
                dispatch(addTaskAC({task: res.data.data.item, todolistId: todolistId}))
                dispatch(setAppStatusAC({status: 'succeeded'}))
                dispatch(changeTodolistEntityStatusAC({id: todolistId, entityStatus: 'succeeded'}))
            } else {
                handleServerAppError(res.data, dispatch)
            }
        })
        .catch((error) => {
            handleServerNetworkError(error, dispatch)
        })
}

export const updateTaskTC = (taskId: string, domainModel: UpdateDomainTaskModalTask, todolistId: string) => (dispatch: Dispatch, getState: () => AppRootStateType) => {
    const state = getState()
    const task = state.tasks[todolistId].find(t => t.id === taskId)

    if (!task) return console.warn("Task Not Fount in the State")

    const apiModel: UpdateTask = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        startDate: task.startDate,
        deadline: task.deadline,
        ...domainModel
    }
    dispatch(setAppStatusAC({status: "loading"}))
    // dispatch(changeTaskEntityStatusAC(taskId, todolistId, "loading"))

    todoListApi.updateTask(todolistId, taskId, apiModel)
        .then(res => {
            if (res.data.resultCode === 0) {
                dispatch(updateTaskAC({id: taskId, model: domainModel, todolistId: todolistId}))
                dispatch(setAppStatusAC({status: "succeeded"}))
                // dispatch(changeTaskEntityStatusAC(taskId, todolistId, "succeeded"))
            } else {
                handleServerAppError(res.data, dispatch)
            }
        })
        .catch((error) => {
            console.log(error)
            handleServerNetworkError(error, dispatch)
        })
}



export type TasksStateType = {
    [id: string]: Array<TaskType>
}

type UpdateDomainTaskModalTask = {
    title?: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriorities
    startDate?: string
    deadline?: string
}

export default tasksReducer;