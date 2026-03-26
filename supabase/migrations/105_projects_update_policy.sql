-- Grant Super Admins permission to update project settings (for feature flags)
DROP POLICY IF EXISTS "Super admins can update projects" ON public.projects;
CREATE POLICY "Super admins can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);
