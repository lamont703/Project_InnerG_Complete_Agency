# Shared by pre-commit and pre-push.
#
# Only one branch is worked on in this project. An assistant once switched to
# main to check something in production, kept working, and the commits landed
# there — which is how production gained changes nobody reviewed on a branch.
#
# The failure is easy to miss because `git push origin <branch>` pushes THAT
# branch's tip regardless of where HEAD is, so the push reports success while
# the new commit sits on main. Guarding the commit is what actually prevents it.
ALLOWED_BRANCH="barber-intel-diagnostic-v2"

# Escape hatch for a human who genuinely needs it. Deliberately verbose so it
# can't be typed by muscle memory, and so it shows up in shell history.
#   I_REALLY_MEAN_IT=yes git commit ...
override_requested() {
    [ "$I_REALLY_MEAN_IT" = "yes" ]
}
