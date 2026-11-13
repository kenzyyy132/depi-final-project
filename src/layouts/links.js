// Where a task or project "lives" for each role. Managers open tasks in the Tasks drawer; developers have a details route.
export const taskHref = (role, id) => (role === 'manager' ? `/manager/tasks?task=${id}` : `/developer/tasks/${id}`);
export const projectHref = (role, id) => (role === 'manager' ? `/manager/projects/${id}` : `/developer/projects?project=${id}`);
