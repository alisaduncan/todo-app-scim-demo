import { Router } from 'express';
import { PrismaClient, Todo } from '@prisma/client';

const prisma = new PrismaClient();
export const todoRoutes = Router();

todoRoutes.get('/todos', async ( req, res) => {

  const todos: Todo[] = await prisma.todo.findMany({
    where: {
      userId: req.user['id']
    }
  });
  res.json({todos});
});

todoRoutes.post('/todos', async (req, res) => {
  const { task } = req.body;
  const id = req.user['id'];
  const todo: Todo = await prisma.todo.create({
    data: {
      task,
      completed: false,
      user: { connect: {id}},
      org: { connect: {id: req.user['orgId']}}
    }
  })

  res.json(todo);
});

todoRoutes.put('/todos/:id', async (req, res) => {
  const id  = parseInt(req.params.id);
  const { task, completed } = req.body;
  let completedAt = null;

  if (completed) {
    completedAt = new Date().toISOString();
  }

  const todo: Todo = await prisma.todo.update({
    where: { id },
    data: { task, completed, completedAt }
  });

  res.json(todo);
});

todoRoutes.delete('/todos/:id', async (req, res) => {
  const id  = parseInt(req.params.id);
  await prisma.todo.delete({
    where: { id }
  });

  res.sendStatus(204);
});
